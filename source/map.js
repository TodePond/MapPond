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

    createEntity("Plane.png", {scale: 0.5}).d
    createEntity("Plane.png", {x: 200, y: 200, scale: 0.5}).d
	createEntity("Plane.png", {x: 200, scale: 0.5}).d
    
})

on.resize(() => {
    canvas.width = innerWidth
    canvas.height = innerHeight
})

on.mousewheel((e) => {
    const {deltaY} = e
	const zoom = (-deltaY / 100) * (camera.scale - camera.scale * (1 - 0.05))
    camera.scale += zoom
	const [mx, my] = Mouse.position
	camera.x += zoom
	camera.y += zoom
	if (camera.scale < 0) camera.scale = 0
})

on.mousemove(e => {
	if (Mouse.Middle) {
		const {movementX, movementY} = e
		camera.x -= movementX / camera.scale
		camera.y -= movementY / camera.scale
	}
})

stage.draw = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const entity of entities.values()) {

        const image = entity.image
        const width = entity.scale * image.width * camera.scale
		const height = entity.scale * image.height * camera.scale
        const x = canvas.width/2 + (entity.x - camera.x - (image.width * entity.scale)/2) * camera.scale
		const y = canvas.height/2 + (entity.y - camera.y - (image.width * entity.scale)/2) * camera.scale

        context.drawImage(image, x, y, width, height)
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
