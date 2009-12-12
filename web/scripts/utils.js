function xhrText(url, resman, closure)
{
    new Ajax.Request(url, {
        method: 'get',
        onSuccess: function(transport)
        {
            closure(transport.responseText)
            resman.loaded('xhr/text of ' + url)
        },
        onException: function(request, exception)
        {
            console.error(exception)
            resman.error('xhr/text of ' + url)
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
            closure(transport.responseJSON)
            resman.loaded('xhr/json of ' + url)
        },
        onException: function(request, exception)
        {
            console.error(exception)
            resman.error('xhr/json of ' + url)
        },
        onFailure: function(transport)
        {
            resman.error('xhr/json of ' + url)
        }
    })
}
