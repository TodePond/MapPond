const stage = Stage.make()
const {canvas, context} = stage

const camera = {x: 0, y: 0, scale: 1}

const entities = new Map()
const createEntity = (source, {x = 0, y = 0, scale = 0} = {}) => {
    const image = getImage(source)
    const id = entities.size
    const entity = {id, source, image, x, y, scale}
    entities.set(id, entity)
    return entity
}

const imageCache = new Map()
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

    const plane = createEntity("Plane.png").d
    plane.scale = 0.5
    
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

const saveEntity = (entity) => {
    let str = ""
    for (const key in entity) {
        str += key + ":" + entity[key]
    }
    return str
}

const save = () => {
    const lines = []
    lines.push("camera:" + camera.values().join(","))
    lines.push("entities:")
    for (const entity of entities.values()) {
        lines.push(`id:${entity.id},source:${entity.source},x:${entity.x},y:${entity.y},scale:${entity.scale}`)
    }
    return lines.join(`\n`)
}
