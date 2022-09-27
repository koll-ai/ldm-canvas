let URL_REGISTER_IF_NOT_EXIST = "https://function-register-if-not-exist-jujlepts2a-ew.a.run.app/"

export function send_connexion_request (credential){
    console.log('sending register request')
    fetch(URL_REGISTER_IF_NOT_EXIST, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({'credential' : credential}),
      })
}