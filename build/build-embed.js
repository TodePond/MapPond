const stage = Stage.make()
const {canvas, context} = stage

const camera = {x: 0, y: 0, scale: 1}
const entities = new Map()
const freeIds = new Set()
const imageCache = new Map()

// Make an entity AND THEN place it on the map
const createEntity = (...args) => {
    const entity = makeEntity(...args)
    registerEntity(entity)
    return entity
}

// Get an entity id that is free to use (note: remember to remove it from the freeIds list if you use it)
const getNewId = () => {
    if (freeIds.size > 0) {
		return freeIds.values().next().value
	}
    else return entities.size
}

// Place an entity on the map
const registerEntity = (entity) => {
    const id = getNewId()
	loadEntity(entity, id)
    return id
}

// Place an entity on the map in a specific id
const loadEntity = (entity, id) => {
	entity.id = id
	entities.set(id, entity)
	freeIds.delete(id)
}

// Remove an entity from the map
const unregisterEntity = (id) => {
    freeIds.add(id)
    entities.delete(id)
}

// Remove all entities
const unregisterAllEntities = () => {
	freeIds.clear()
	entities.clear()
}

// Make an entity object
const makeEntity = (source, {x = 0, y = 0, scale = 1} = {}) => {
    const image = getImage(source)
    const entity = {id: undefined, source, image, x, y, scale}
    return entity
}

// Get an image element (make one if needed)
const getImage = (source) => {
    const cachedImage = imageCache.get(source)
    if (cachedImage !== undefined) return cachedImage
    const image = new Image()
    image.src = `../images/${source}`
    imageCache.set(source, image)
    return image
}

on.load(() => {
    document.body.appendChild(canvas)
    document.body.style["margin"] = "0"
    canvas.style["background-color"] = "rgb(45, 56, 77)"
    trigger("resize")

    const plane = createEntity("Plane.png", {x: 100, scale: 0.5}).d
    
    const plane2 = createEntity("Plane.png", {x: 50}).d
    
})

on.resize(() => {
    canvas.width = innerWidth
    canvas.height = innerHeight
})

on.mousewheel((e) => {
    const {deltaY} = e
    camera.scale += deltaY / 100 * 0.05
})

stage.draw = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const entity of entities.values()) {
        const screen = {
            x: entity.x - camera.x,
            y: entity.y - camera.y,
            scale: entity.scale * camera.scale,
        }
        
        const {x, y} = screen
        const {image} = entity
        const [width, height] = [screen.scale * image.width, screen.scale * image.height]

        context.drawImage(image, screen.x, screen.y, width, height)
    }
}

// Save the map state to a string
const save = () => {
    const lines = []
    lines.push(`camera:x=${camera.x},y=${camera.y},scale=${camera.scale}`)
    lines.push(`entities:`)
    for (const entity of entities.values()) {
        lines.push(`id=${entity.id},source=${entity.source},x=${entity.x},y=${entity.y},scale=${entity.scale}`)
    }
    return lines.join(`\n`)
}

const Load = MotherTode(`
	:: Camera "\n" Entities
	Camera (
		:: "camera:x=" Number ",y=" Number ",scale=" Number
		>> ([c, x, _1, y, _2, scale]) => {
			camera.x = x.output
			camera.y = y.output
			camera.scale = scale.output
		}
	)
	Entities :: "entities:" { Entity }
	Entity (
		:: "\nid=" Number ",source=" String ",x=" Number ",y=" Number ",scale=" Number
		>> ([_1, id, _2, source, _3, x, _4, y, _5, scale]) => {
			const entity = makeEntity(source.output, {x: x.output, y: y.output, scale: scale.output})
			loadEntity(entity, id.output)
		}
	)
	String :: /[^,]/+
	Number :: /[0-9.]/+ >> (n) => n.output.as(Number)
`)

// Load a map state
const load = (save) => {
	MotherTode.Term.resetCache()
	unregisterAllEntities()
	return Load(save)
}
