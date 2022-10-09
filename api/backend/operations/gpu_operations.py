import base64
from . import users_operations
from . import pubsub_operations
from . import db_operations
import requests
import uuid
from . import appsync_operations




def imagen(action, params):
    # send to gpu

    try:    
        idinfo = users_operations.get_userinfo_for_credential(params['credential'])
    except ValueError as e:
        print("Some finicky shits")
        print(e)
        return -1
        
    image_uuid = str(uuid.uuid4())
    params['uuid'] = image_uuid

    pubsub_operations.send_pubsub(action = action, params = params)
   
    # alert fronts that a new image is generating

    params['action'] = "generating_image"
    
    queue_size = db_operations.get_queue_size()
    params['queue_size'] = queue_size
    appsync_operations.push_to_clients(params['room'], params)


    data_to_bdd = dict(
        uuid = image_uuid,
        posX = params['posX'],
        posY = params['posY'],
        width = params['width'],
        height = params ['height'],
        prompt = base64.b64decode(params['prompt']).decode('utf-8'),
        room = params ['room'],
        status = 'waiting',
        email = idinfo['email']
    )

    db_operations.insert_to_sql("images", data_to_bdd)


    return 1