loaded = false

function interactWithAdjacentObjects_allowsMove(os)
{
    // I don't like that this function has side effects as well as returning
    // boolean for passable/not, but...
    
    var playedPickUp = false
    var canMove = true
    var needBubble = false
    os.each(function(o)
    {
        if (o.tile == 'Key')
        {
            if (!playedPickUp)
            {
                playedPickUp = true
                sounds['Pickup'].play()
            }
            inventory.push('Key')
            removeFromWorld(o)
        }
        else if (o.tile == 'Character Horn Girl')
        {
            canMove = false
            needBubble = true
            $('bubble-speech').innerHTML = ALYNA_SPEECH
            placeBubble(o.x, o.y, map['objects'][0].x, map['objects'][0].y)
        }
        else
        {
            console.error('Interaction with unknown object: ' + o.tile)
        }
    })
    
    if (needBubble)
    {
        $('bubble').style.visibility = 'visible'
    }
    else
    {
        $('bubble').style.visibility = 'hidden'
    }
    
    return canMove
}

function doMove(object, dx, dy)
{
    var new_x = object.x + dx
    var new_y = object.y + dy
    
     if (new_x >= map['width']  || new_x < 0 ||
         new_y >= map['height'] || new_y < 0)
    {
        return
    }
    
    var current_tile = tileAt(object.x, object.y, object.h - 1)
    var next_tile_wall = tileAt(new_x, new_y, object.h)
    var next_tile_ground = tileAt(new_x, new_y, object.h - 1)
     if (passable(next_tile_wall) && next_tile_ground)
    {
        var os = objectsAt(new_x, new_y, object.h)
        if (interactWithAdjacentObjects_allowsMove(os))
        {
            object.x = new_x
            object.y = new_y
        }
    }
    else if (next_tile_wall == 'Door Tall Closed')
    {
        if (inventory.indexOf('Key') >= 0)
        {
            sounds['Door'].play()
            map['planes'][object.h][new_x + map['width'] * new_y] = 'Door Tall Open'
            inventory.splice(inventory.indexOf('Key'), 1)
            object.x = new_x
            object.y = new_y
            
            // FIXME this leaks some VBOs, but it doesn't happen often,
            // should be fixed when WebGL matures and gives OpenGL objects
            // finalizers, and isn't easy to fix here and now.
            drawCommands[new_y] = null
        }
        else
        {
            sounds['Locked'].play()
        }
    }
    else if (next_tile_wall == rampTile(dx, dy))
    {
        var os = objectsAt(new_x, new_y, object.h + 1)
        if (interactWithAdjacentObjects_allowsMove(os))
        {
            object.x = new_x
            object.y = new_y
            object.h += 1
        }
    }
    else if (current_tile == rampTile(-dx, -dy))
    {
        var next_tile_ground2 = tileAt(new_x, new_y, object.h - 2)
        if (!next_tile_ground && next_tile_ground2)
        {
            var os = objectsAt(new_x, new_y, object.h - 1)
            if (interactWithAdjacentObjects_allowsMove(os))
            {
                object.x = new_x
                object.y = new_y
                object.h -= 1
            }
        }
    }
}

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
            
            update_scroll()
            inventory = []
            
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
    setInterval(function() { draw(gl) }, 10)
}

function keydown(event)
{
    pc = map['objects'][0]
    switch(event.keyCode)
    {
    case Event.KEY_LEFT:
        doMove(pc, -1, 0)
        break
    case Event.KEY_RIGHT:
        doMove(pc,  1, 0)
        break
    case Event.KEY_DOWN:
        doMove(pc, 0,  1)
        break
    case Event.KEY_UP:
        doMove(pc, 0, -1)
        break
    }
    update_scroll()
}

function keyup(event)
{
}
