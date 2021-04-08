const stage = Stage.make()
const {canvas, context} = stage

const camera = {x: 0, y: 0, scale: 1}
const entities = new Map()
const layers = new Map()
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
	const {z} = entity
	if (layers.get(z) === undefined) {
		layers.set(z, new Map())
	}
	const layer = layers.get(z)
	layer.set(id, entity)
}

// Remove an entity from the map
const unregisterEntity = (id) => {
	const entity = entities.get(id)
    freeIds.add(id)
    entities.delete(id)

	const {z} = entity
	const layer = layers.get(z)
	layer.delete(id)
	if (layer.size === 0) layer.delete(z)
}

// Remove all entities
const unregisterAllEntities = () => {
	freeIds.clear()
	entities.clear()
	layers.clear()
}

// Make an entity object
const makeEntity = (source, {x = 0, y = 0, z = 0, scale = 1} = {}) => {
    const image = getImage(source)
    const entity = {id: undefined, source, image, x, y, z, scale}
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
	createEntity("Plane.png", {x: 200, scale: 0.5, z: -1}).d
    
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
	updateHovers()
})

on.mousemove(e => {
	updateHovers()
	if (Mouse.Middle) {
		const {movementX, movementY} = e
		camera.x -= movementX / camera.scale
		camera.y -= movementY / camera.scale
		return
	}
})

on.mousedown(e => {
	if (e.button === 0) {

	}
})

const getHits = (x, y) => {
	const hits = new Set()
	for (const entity of entities.values()) {
		const space = getSpace(entity)
		const isCollision = isSpaceCollision([x, y], space)
		if (isCollision) hits.add(entity)
	}
	return hits
}

const getHit = (x, y) => {
	const hits = getHits(x, y)
	const hit = findTopHit(hits)
	return hit
}

const findTopHit = (hits) => {
	return [...hits.values()].reduce((a, b) => a.z > b.z? a : b, {z: -Infinity})
}

const updateHovers = () => {
	const [mx, my] = Mouse.position
	const hits = getHits(mx, my)
	const hit = findTopHit(hits)
	for (const entity of entities.values()) {
		if (hit === entity) {
			entity.highlight = true
			entity.hover = true
		}
		else if (hits.has(entity)) {
			entity.hover = true
			entity.highlight = false
		}
		else {
			entity.hover = false
			entity.highlight = false
		}
	}
}

const isSpaceCollision = ([px, py], {x, y, width, height}) => {
	if (px < x) return false
	if (py < y) return false
	if (px > x + width) return false
	if (py > y + height) return false
	return true
}

const getSpace = (entity) => {
	const image = entity.image
	const width = entity.scale * image.width * camera.scale
	const height = entity.scale * image.height * camera.scale
	const x = canvas.width/2 + (entity.x - camera.x - (image.width * entity.scale)/2) * camera.scale
	const y = canvas.height/2 + (entity.y - camera.y - (image.width * entity.scale)/2) * camera.scale
	return {width, height, x, y}
}

stage.draw = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);

	// Images
	const zs = [...layers.keys()].sort((a, b) => a - b)
	for (const z of zs) {
		const layer = layers.get(z)
		for (const entity of layer.values()) {
			const {image} = entity
			const {width, height, x, y} = getSpace(entity)
			context.drawImage(image, x, y, width, height)
		}
	}

	// Hovers
	context.lineWidth = 5 * camera.scale
	for (const entity of entities.values()) {
        const {width, height, x, y} = getSpace(entity)
		if (entity.highlight) {
			context.fillStyle = "rgba(0, 128, 255, 25%)"
			context.fillRect(x, y, width, height)
		}
		if (entity.hover) {
			context.strokeStyle = "rgba(0, 128, 255)"
			context.strokeRect(x, y, width, height)
		}
    }
}

// Save the map state to a string
const save = () => {
    const lines = []
    lines.push(`camera:x=${camera.x},y=${camera.y},scale=${camera.scale}`)
    lines.push(`entities:`)
    for (const entity of entities.values()) {
        lines.push(`id=${entity.id},source=${entity.source},x=${entity.x},y=${entity.y},z=${entity.z},scale=${entity.scale}`)
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
		:: "\nid=" Number ",source=" String ",x=" Number ",y=" Number ",z=" Number ",scale=" Number
		>> ([_1, id, _2, source, _3, x, _4, y, _5, z, _6, scale]) => {
			const entity = makeEntity(source.output, {x: x.output, y: y.output, z: z.output, scale: scale.output})
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
