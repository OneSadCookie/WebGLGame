loaded = false

function init()
{
    var gl = initWebGL('game')
    object_vbo = gl.createBuffer()
    object_ebo = gl.createBuffer()
    
    var resman = new ResourceManager(
        12, // total # of expected resources to load, set to 0 and watch console log if it's wrong
        function(name) // progress
        {
            // console.log('Loaded: ' + name)
            $('progress-bar').style.width = resman.percentComplete() + '%'
        },
        function(name) // success
        {
            loadPlanes(gl, map['width'], map['height'], map['planes'])
            inventory = []
            
            // this is a bit of a hack :/
            var pc = map['objects'][0]
            updateUI([new ObjectMoveEvent(
                pc,
                pc.x, pc.y, pc.h,
                pc.x, pc.y, pc.h)])
            
            $('progress-box').style.visibility = 'hidden'
            $('game').style.visibility = 'visible'
            $('framerate').style.visibility = 'visible'
            $('ack').style.visibility = 'visible'
            loaded = true
        },
        function(name) // failure
        {
            $('progress-bar').style.backgroundColor = 'red'
            $('progress-box').style.borderColor = 'red'
        })
    
    linkProgram('shaders/tiles.vert', 'shaders/boring.frag', gl, resman, function (p)
    {
        program = p
    })

    TEXTURE_FILES.each(function(base)
    {
        loadTexture(escape('images/' + base + '.png'), gl, resman, function(i, t)
        {
            images[base] = i
            textures[base] = t
        })
    })
    
    AUDIO_FILES.each(function(base)
    {
        xhrAudio(escape('audio/' + base + '.wav'), resman, function(s)
        {
            sounds[base] = s
        })
    })
    
    xhrJSON('images/tilemetrics.json', resman, function(json)
    {
        tilemetrics = json
    })
    
    xhrJSON('maps/map.json', resman, function(json)
    {
        map = json
    })
    
    return gl
}

function start()
{
    var gl = init()
    framerate = new Framerate('framerate')
    setInterval(function() {
        draw(gl)
    }, 10)
}

function keydown(event)
{
    var events = []
    var pc = map['objects'][0]
    switch(event.keyCode)
    {
    case Event.KEY_LEFT:
        doMove(pc, -1, 0, events)
        break
    case Event.KEY_RIGHT:
        doMove(pc,  1, 0, events)
        break
    case Event.KEY_DOWN:
        doMove(pc, 0,  1, events)
        break
    case Event.KEY_UP:
        doMove(pc, 0, -1, events)
        break
    }
    updateUI(events)
}

function keyup(event)
{
}
