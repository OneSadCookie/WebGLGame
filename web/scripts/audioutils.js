function xhrAudio(url, resman, closure)
{
    var audio = new Audio()
    audio.observe('canplaythrough', function(event)
    {
        closure(audio)
        resman.loaded('Audio ' + url)
    })
    audio.observe('error', function(event)
    {
        resman.error('Audio ' + url)
    })
    audio.observe('abort', function(event)
    {
        resman.error('Audio ' + url)
    })
    audio.src = url
    audio.load()
}
