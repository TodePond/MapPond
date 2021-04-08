const stage = Stage.make()
const {canvas, context} = stage

const camera = {x: 0, y: 0, scale: 1}
const entities = new Map()
const layers = new Map()
const freeIds = new Set()

const selectedEntities = new Set()
const selectionBoxStart = [undefined, undefined]
let pressedEntity = undefined

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
const makeEntity = (source, {x = 0, y = 0, z = 0, scale = 1, rotation = 0} = {}) => {
    const image = getImage(source)
    const entity = {id: undefined, source, image, x, y, z, scale, rotation}
    return entity
}

// Get an image element (make one if needed)
const getImage = (source) => {
	if (source === undefined) return new Image()
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
	createEntity("Plane.png", {x: 200, scale: 0.5, z: -1}).d
    createEntity("Plane.png", {x: 200, y: 200, scale: 0.5, rotation: 45}).d
    
})

on.resize(() => {
    canvas.width = innerWidth
    canvas.height = innerHeight
})

on.mousewheel((e) => {
    const {deltaY} = e
	const zoom = (-deltaY / 100) * (camera.scale - camera.scale * (1 - 0.05))
    camera.scale += zoom
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
	}
	else if (Mouse.Right) {
		const {movementX, movementY} = e
		for (const entity of selectedEntities.values()) {
			entity.x += movementX / camera.scale
			entity.y += movementY / camera.scale
		}
	}
})

on.mousedown(e => {
	if (e.button === 0) {
		const [mx, my] = Mouse.position
		selectionBoxStart[0] = mx
		selectionBoxStart[1] = my
		
	}
})

on.mouseup(e => {
	if (e.button === 0) {
		const [mx, my] = Mouse.position
		const [sx, sy] = selectionBoxStart
		if (sx !== undefined || sy !== undefined) {
			const hits = getSelects([sx, sy], [mx, my])
			
			if (!e.shiftKey && !e.ctrlKey) {
				selectedEntities.clear()
			}

			for (const hit of hits.values()) {
				selectedEntities.add(hit.d)
			}
			
			selectionBoxStart[0] = undefined
			selectionBoxStart[1] = undefined
		}
	}
})

on.contextmenu(e => e.preventDefault())

const getHits = (x, y) => {
	const hits = new Set()
	for (const entity of entities.values()) {
		const space = getEntitySpace(entity)
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
	const dummy = {z: -Infinity}
	const hit = [...hits.values()].reduce((a, b) => a.z > b.z? a : b, dummy)
	if (dummy === hit) return undefined
	return hit
}

const updateHovers = () => {
	const [mx, my] = Mouse.position
	const [sx, sy] = selectionBoxStart
	if (sx === undefined || sy === undefined) {
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
		return
	}
	else {
		const hits = getSelects([sx, sy], [mx, my])
		for (const entity of entities.values()) {
			if (hits.has(entity)) {
				entity.hover = true
				entity.highlight = true
			}
			else {
				entity.hover = false
				entity.highlight = false
			}
		}
	}
}

const getSelects = ([sx, sy], [mx, my]) => {
	const hits = new Set()
	const selection = {rotation: 0, position: [sx, sy], center: [sx+(mx-sx)/2, sy+(my-sy)/2], dimensions: [mx-sx, my-sy]}
	for (const entity of entities.values()) {
		const space = getEntitySpace(entity)
		if (isSpaceCollision([mx, my], space)) {
			hits.add(entity)
			continue
		}
		if (isSpaceCollision(space.center, selection)) {
			hits.add(entity)
			continue
		}
		for (const corner of space.corners) {
			const rcorner = rotate(corner, space.center, space.rotation)
			if (isSpaceCollision(rcorner, selection)) {
				hits.add(entity)
				break
			}
		}
	}
	return hits
}

// https://en.wikipedia.org/wiki/Polar_coordinate_system#Converting_between_polar_and_Cartesian_coordinates
const rotate = ([x, y], [ox, oy], radians) => {
	const [dx, dy] = [x - ox, y - oy]
	const d = Math.sqrt(dx**2 + dy**2)
	const angle = Math.atan2(dy,dx)
	const [rx, ry] = [d * Math.cos(radians + angle), d * Math.sin(radians + angle)]
	return [ox + rx, oy + ry]
}

const isSpaceCollision = ([x, y], {rotation, position, center, dimensions}) => {
	if (rotation !== 0) {
		const [rx, ry] = rotate([x, y], center, -rotation)
		return isSpaceCollision([rx, ry], {rotation: 0, position, center, dimensions})
	}

	const [px, py] = position
	const [width, height] = dimensions

	const left = Math.min(px, px + width)
	const right = Math.max(px, px + width)
	const top = Math.min(py, py + height)
	const bottom = Math.max(py, py + height)

	if (x < left) return false
	if (x > right) return false
	if (y < top) return false
	if (y > bottom) return false
	return true
}

const toRadians = (degrees) => degrees * Math.PI / 180

const makeSpace = ({scale = 1, x = 0, y = 0, width = 100, height = 100, rotation = 0}) => {

	const w = scale * width * camera.scale
	const h = scale * height * camera.scale
	const dimensions = [w, h]

	const px = canvas.width/2 + (x - camera.x - (width * scale)/2) * camera.scale
	const py = canvas.height/2 + (y - camera.y - (height * scale)/2) * camera.scale
	const position = [px, py]

	const cx = px + w/2
	const cy = py + h/2
	const center = [cx, cy]

	const corners = [
		[px, py],
		[px + w, py],
		[px + w, py + h],
		[px, py + h],
	]
	
	return {dimensions, position, center, corners, rotation: toRadians(rotation)}
}

const getEntitySpace = (entity) => {
	const image = entity.image
	const [width, height] = [image.width, image.height]
	const {scale, x, y, rotation} = entity
	return makeSpace({scale, x, y, width, height, rotation})
}

stage.draw = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);

	// Images
	const zs = [...layers.keys()].sort((a, b) => a - b)
	for (const z of zs) {
		const layer = layers.get(z)
		for (const entity of layer.values()) {
			const {image} = entity
			const {dimensions, rotation, center} = getEntitySpace(entity)

			const [width, height] = dimensions
			const [cx, cy] = center
			const [ox, oy] = [-width/2, -height/2]

			context.translate(cx, cy)
			context.rotate(rotation)
			context.drawImage(image, ox, oy, width, height)
			context.rotate(-rotation)
			context.translate(-(cx), -(cy))
		}
	}

	// Hovers
	context.lineWidth = 5 * camera.scale
	for (const entity of entities.values()) {
        const {dimensions, position, rotation, center} = getEntitySpace(entity)
		
		const [width, height] = dimensions
		const [cx, cy] = center
		const [ox, oy] = [-width/2, -height/2]

		context.translate(cx, cy)
		context.rotate(rotation)
		
		if (entity.highlight) {
			context.fillStyle = "rgba(0, 128, 255, 25%)"
			context.fillRect(ox, oy, width, height)
		}

		if (selectedEntities.has(entity)) {
			context.strokeStyle = "rgba(0, 255, 128)"
			context.strokeRect(ox, oy, width, height)
		}
		else if (entity.hover) {
			context.strokeStyle = "rgba(0, 128, 255)"
			context.strokeRect(ox, oy, width, height)
		}

		context.rotate(-rotation)
		context.translate(-(cx), -(cy))

    }

	if (Mouse.Left) {
		const [sx, sy] = selectionBoxStart
		if (sx !== undefined && sy !== undefined) {
			const [mx, my] = Mouse.position
			context.strokeStyle = "rgba(0, 128, 255)"
			context.strokeRect(sx, sy, mx - sx, my - sy)
			context.fillStyle = "rgba(0, 128, 255, 25%)"
			context.fillRect(sx, sy, mx - sx, my - sy)
		}
	}
}

// Save the map state to a string
const save = () => {
    const lines = []
    lines.push(`camera:x=${camera.x},y=${camera.y},scale=${camera.scale}`)
    lines.push(`entities:`)
    for (const entity of entities.values()) {
        lines.push(`id=${entity.id},source=${entity.source},x=${entity.x},y=${entity.y},z=${entity.z},scale=${entity.scale},rotation=${entity.rotation}`)
    }
    return lines.join(`\n`)
}

const Load = MotherTode(`
	:: Camera "\n" Entities EOF
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
		:: "\nid=" Number ",source=" String ",x=" Number ",y=" Number ",z=" Number ",scale=" Number ",rotation=" Number
		?? ([_1, id, _2, source, _3, x, _4, y, _5, z, _6, scale, _7, rotation]) => {
			const entity = makeEntity(source.output, {x: x.output, y: y.output, z: z.output, scale: scale.output, rotation: rotation.output})
			loadEntity(entity, id.output)
			return true
		}
	)
	String :: /[^,]/+
	Number :: "-"? /[0-9.]/+ >> (n) => n.output.as(Number)
`)

// Load a map state
const load = (save) => {
	MotherTode.Term.resetCache()
	unregisterAllEntities()
	return Load(save)
}
