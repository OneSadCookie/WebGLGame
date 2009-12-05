// this file copied, refactored, etc. from utils3d.js

// The WebGL spec was recently updated to replace the Canvas prefix on types with the WebGL prefix.
// For compatibility reasons we set up aliases to from the WebGL prefixed typename to the
// Canvas prefixed name for the benefit of older builds of WebKit and Mozilla
if (!("WebGLFloatArray" in window))
    WebGLFloatArray = window.CanvasFloatArray;
if (!("WebGLByteArray" in window))
    WebGLByteArray = window.CanvasByteArray;
if (!("WebGLIntArray" in window))
    WebGLIntArray = window.CanvasIntArray;
if (!("WebGLShortArray" in window))
    WebGLShortArray = window.CanvasShortArray;
if (!("WebGLUnsignedByteArray" in window))
    WebGLUnsignedByteArray = window.CanvasUnsignedByteArray;
if (!("WebGLUnsignedIntArray" in window))
    WebGLUnsignedIntArray = window.CanvasUnsignedIntArray;
if (!("WebGLUnsignedShortArray" in window))
    WebGLUnsignedShortArray = window.CanvasUnsignedShortArray;

function loadShader(gl, shaderId)
{
    var shaderScript = document.getElementById(shaderId)
    if (!shaderScript) {
        console.log("*** Error: shader script '"+shaderId+"' not found")
        return null
    }

    if (shaderScript.type == "x-shader/x-vertex")
        var shaderType = gl.VERTEX_SHADER
    else if (shaderScript.type == "x-shader/x-fragment")
        var shaderType = gl.FRAGMENT_SHADER
    else {
        console.log("*** Error: shader script '"+shaderId+"' of undefined type '"+shaderScript.type+"'")       
        return null
    }

    // Create the shader object
    var shader = gl.createShader(shaderType)
    if (shader == null) {
        console.log("*** Error: unable to create shader '"+shaderId+"'")       
        return null
    }

    // Load the shader source
    gl.shaderSource(shader, shaderScript.text)

    // Compile the shader
    gl.compileShader(shader)

    // Check the compile status
    var compiled = gl.getShaderi(shader, gl.COMPILE_STATUS)
    if (!compiled) {
        // Something went wrong during compilation get the error
        var error = gl.getShaderInfoLog(shader)
        console.log("*** Error compiling shader '"+shaderId+"':"+error)
        gl.deleteShader(shader)
        return null
    }

    return shader
}

function loadProgram(gl, vshader, fshader)
{
    // create our shaders
    var vertexShader = loadShader(gl, vshader)
    var fragmentShader = loadShader(gl, fshader)

    if (!vertexShader || !fragmentShader)
    {
        console.log("Error loading program's component shaders")
        return null
    }

    // Create the program object
    var program = gl.createProgram()

    if (!program)
    {
        console.log("Failed to create GL program object")
        return null
    }

    // Attach our two shaders to the program
    gl.attachShader (program, vertexShader)
    gl.attachShader (program, fragmentShader)

    // Link the program
    gl.linkProgram(program)

    // Check the link status
    var linked = gl.getProgrami(program, gl.LINK_STATUS)
    if (!linked) {
        // something went wrong with the link
        var error = gl.getProgramInfoLog (program)
        console.log("Error in program linking:"+error)

        gl.deleteProgram(program)
        gl.deleteProgram(fragmentShader)
        gl.deleteProgram(vertexShader)

        return null
    }
    
    return program
}

// culled from utils3d.js
function initWebGL(canvasName)
{
    var canvas = document.getElementById(canvasName)
    var gl

    try {gl = canvas.getContext("webkit-3d") } catch(e) { }
    if (!gl)
        try {gl = canvas.getContext("moz-webgl") } catch(e) { }
    if (!gl) {
        alert("No WebGL context found")
        return null
    }
    
    return gl
}

function loadImageTexture(gl, url)
{
    var texture = gl.createTexture();
    texture.image = new Image();
    texture.image.onload = function() { doLoadImageTexture(gl, texture.image, texture) }
    texture.image.src = url;
    return texture;
}

function doLoadImageTexture(gl, image, texture)
{
    gl.enable(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, image);
}

Framerate = function(id)
{
    this.numFramerates = 10;
    this.framerateUpdateInterval = 500;
    this.id = id;

    this.renderTime = -1;
    this.framerates = [ ];
    self = this;
    var fr = function() { self.updateFramerate() }
    setInterval(fr, this.framerateUpdateInterval);
}

Framerate.prototype.updateFramerate = function()
{
    var tot = 0;
    for (var i = 0; i < this.framerates.length; ++i)
        tot += this.framerates[i];

    var framerate = tot / this.framerates.length;
    framerate = Math.round(framerate);
    document.getElementById(this.id).innerHTML = framerate+" fps";
}

Framerate.prototype.snapshot = function()
{
    if (this.renderTime < 0)
        this.renderTime = new Date().getTime();
    else {
        var newTime = new Date().getTime();
        var t = newTime - this.renderTime;
        var framerate = 1000/t;
        this.framerates.push(framerate);
        while (this.framerates.length > this.numFramerates)
            this.framerates.shift();
        this.renderTime = newTime;
    }
}
