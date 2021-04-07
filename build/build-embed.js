const stage = Stage.make()
const {canvas, context} = stage

const sprites = new Map()
const entities = new Map()

const makeEntity = (src) => {
    const img = getImage(src)
    return img
}

const getImage = (src) => {
    const img = new Image(`img/${src}`)
    return img
}

on.load(() => {
    document.body.appendChild(canvas)
    document.body.style["margin"] = "0"
    canvas.style["background-color"] = "rgb(45, 56, 77)"
    trigger("resize")
})

on.resize(() => {
    canvas.width = innerWidth
    canvas.height = innerHeight
})

stage.draw = () => {
    context.fillStyle = "red"
    context.fillRect(20, 20, 50, 50)
}

