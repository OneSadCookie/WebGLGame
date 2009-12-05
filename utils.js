function xhrText(url, resman, closure)
{
    new Ajax.Request(url, {
        method: 'get',
        onSuccess: function(transport)
        {
            resman.loaded('xhr/text of ' + url)
            closure(transport.responseText)
        },
        onFailure: function(transport)
        {
            resman.error('xhr/text of ' + url)
        }
    })
}

function xhrJSON(url, resman, closure)
{
    new Ajax.Request(url, {
        method: 'get',
        evalJSON: 'force',
        onSuccess: function(transport)
        {
            resman.loaded('xhr/json of ' + url)
            closure(transport.responseJSON)
        },
        onFailure: function(transport)
        {
            resman.error('xhr/json of ' + url)
        }
    })
}
