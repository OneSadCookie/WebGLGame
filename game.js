width = 1
height = 1

vbo = null
ebo = null
program = null
image = null
texture = null

function makeBufferObjects(gl)
{
    var quadarray = new WebGLFloatArray([
        100, 100, 300, 100, 300, 300, 100, 300, // vertices
        0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, // texcoords
    ])
    
    vbo = gl.createBuffer()
    if (!vbo) console.log("Failed to create vbo")
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.bufferData(gl.ARRAY_BUFFER, quadarray, gl.STATIC_DRAW)
    
    var indexarray = new WebGLUnsignedShortArray([
        0, 1, 2, 0, 2, 3
    ])
    
    ebo = gl.createBuffer()
    if (!ebo) console.log("Failed to create ebo")
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexarray, gl.STATIC_DRAW)
}

function init()
{
    var gl = initWebGL('game')
    makeBufferObjects(gl)
    
    var resman = new ResourceManager(
        7,
        function (name) // progress
        {
            console.log('Loaded: ' + name)
            $('progress-bar').style.width = resman.percentComplete() + '%'
        },
        function (name) // success
        {
            $('progress-box').style.visibility = 'hidden'
            $('game').style.visibility = 'visible'
            $('framerate').style.visibility = 'visible'
        },
        function (name) // failure
        {
            $('progress-bar').style.backgroundColor = 'red'
        })
    
    linkProgram('shaders/pixels.vert', 'shaders/boring.frag', gl, resman, function (p)
    {
        program = p
    })
    loadTexture('PlanetCutePNG/Character%20Horn%20Girl.png', gl, resman, function(i, t)
    {
        image = i
        texture = t
    })
    
    return gl
}

function reshape(gl)
{
    var canvas = document.getElementById('game')
    if (canvas.clientWidth == width && canvas.clientHeight == height)
        return

    width = canvas.clientWidth
    height = canvas.clientHeight
    
    gl.viewport(0, 0, width, height)
}

function draw(gl)
{
    if (!vbo || !ebo || !program || !texture)
    {
        return
    }
    
    reshape(gl)
    gl.clearColor(1, 0, 1, 1)
    $('framerate').backgroundColor = '#ff00ff'
    gl.clear(gl.COLOR_BUFFER_BIT)
    
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.BLEND)

    gl.useProgram(program)

    gl.bindTexture(gl.TEXTURE_2D, texture)

    gl.uniform2f(
        gl.getUniformLocation(program, 'window_size'),
        width,
        height)
    gl.uniform1i(
        gl.getUniformLocation(program, 'texture'),
        0)
    
    pos_loc = gl.getAttribLocation(program, 'position')
    tc_loc = gl.getAttribLocation(program, 'tc_in')
    
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.vertexAttribPointer(
        pos_loc,
        2,
        gl.FLOAT,
        false,
        0,
        0)
    gl.enableVertexAttribArray(pos_loc)
    gl.vertexAttribPointer(
        tc_loc,
        2,
        gl.FLOAT,
        false,
        0,
        32)
    gl.enableVertexAttribArray(tc_loc)
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo)
    gl.drawElements(
        gl.TRIANGLE_FAN,
        6,
        gl.UNSIGNED_SHORT,
        0)

    gl.flush()
    framerate.snapshot()
    e = gl.getError()
    if (e != 0)
    {
        console.log('GL Error: ' + e)
    }
}

function start()
{
    var gl = init()
    framerate = new Framerate('framerate')
    setInterval(function() { draw(gl) }, 10)
}
