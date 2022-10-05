import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { createSearchParams, useSearchParams } from "react-router-dom";
import URLImage from './URLImage';
import PromptRect from './promptRect';
import LoadPlaceholder from './LoadPlaceholder';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import ImageSaverLayer from './imageSaveLayer';
import Amplify from '@aws-amplify/core'
import * as gen from './generated'
import HelpModalButton from './helpModal'

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// import ImageSaver from './ImageSaver';
// import * as env from './env.js';
import * as requests from './requests'

Amplify.configure(gen.config)

const URL_BUCKET = "https://storage.googleapis.com/aicanvas-public-bucket/"

const URL_START_VM = "https://function-start-vm-jujlepts2a-ew.a.run.app"
const URL_STOP_VM = "https://function-stop-jujlepts2a-ew.a.run.app"
const URL_STATUS_VM = "https://function-get-status-gpu-jujlepts2a-ew.a.run.app"

const URL_GET_IMAGES = 'https://europe-west1-ai-canvas.cloudfunctions.net/function-get_images_for_pos'

const URL_FUNCTION_IMAGEN = "https://imagen-pubsub-jujlepts2a-ew.a.run.app/"


//modes
const EDIT = "EDIT";
const VIEW = "VIEW";

//states
const IDLE = "IDLE";
const SELECT = "SELECT";
const PROMPT = "PROMPT";
const MOVE = "MOVE";
const CHOOSE_TYPE = "CHOOSE_TYPE";

//camera speed
const CAMERA_ZOOM_SPEED = 1.1;
const MIN_ZOOM = 0.01;
const MAX_ZOOM = 1;

let generation_type;
let cursor_pos = [0, 0];

const MyCanvas = (props) => {
  const stageRef = useRef(null);
  const imageLayerRef = useRef(null);
  const imageSaveRef = useRef(null);

  const [imageSave, setImageSave] = useState(null);

  const [currentMode, setCurrentMode] = useState(VIEW);
  const [currentState, setCurrentState] = useState(IDLE);

  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);

  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [cursor, setCursor] = useState('default');

  const [canvasW, setCanvasW] = useState(window.innerWidth);
  const [canvasH, setCanvasH] = useState(window.innerHeight);

  //camera
  const [camInitX, setCamInitX] = useState(0);
  const [camInitY, setCamInitY] = useState(0);
  const [cameraX, setCameraX] = useState(0);
  const [cameraY, setCameraY] = useState(0);
  const [cameraZoom, setCameraZoom] = useState(1);

  const [searchParams, setSearchParams] = useSearchParams();

  const [imageDivList, setImageDivList] = useState([]);
  const [placeholderList, setPlaceholderList] = useState(new Map());

  //mobile
  const [touchesDist, setTouchesDist] = React.useState(Infinity);
  const [cameraZoomStart, setCameraZoomStart] = React.useState(1);

  const [isLogged, setIsLogged] = useState(false);

  const [room, setRoom] = useState('default');

  const [credential, setCredential] = useState('');

  function handle_receive_from_socket(data) {
    data = JSON.parse(data)

    var z = Math.min(canvasW / +data.width, canvasH / +data.height) * 0.5;
    var x = +data.posX - (canvasW / 2) / z + +data.width / 2
    var y = +data.posY - (canvasH / 2) / z + +data.height / 2

    if (data.action === "new_image") {
      removePlaceholder(data.posX, data.posY)
      addNewImage(URL_BUCKET + data.path, data.posX, data.posY, data.width, data.height, data.prompt)
      toast(<div onClick={() => { moveCamera(x, y, z) }}>
        New image: {data.prompt} at ({data.posX}, {data.posY})
      </div >, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    }

    if (data.action === "generating_image") {
      console.log(data.queue_size)
      addNewPlaceholder(data.posX, data.posY, data.width, data.height)
    }
  }

  //socket
  useEffect(() => {
    const subscription = gen.subscribe(room, ({ data }) => handle_receive_from_socket(data))
    return () => subscription.unsubscribe()
  }, [room])

  //on page load
  useEffect(() => {
    const onPageLoad = () => {
      // setIsMobile(window.innerWidth <= 768);

      var x = searchParams.get("x") !== null ? +searchParams.get("x") : 0;
      var y = searchParams.get("y") !== null ? +searchParams.get("y") : 0;
      var zoom = searchParams.get("zoom") !== null ? + searchParams.get("zoom")/100 : 1;

      handleClickRefresh();

      moveCamera(x, y, zoom);
    };

    const onPageResize = () => {
      setCanvasW(window.innerWidth);
      setCanvasH(window.innerHeight);
    }

    window.addEventListener("resize", onPageResize);

    window.addEventListener('contextmenu', event => event.preventDefault());

    // Check if the page has already loaded
    if (document.readyState === "complete") {
      onPageLoad();
    } else {
      window.addEventListener("load", onPageLoad);
      // Remove the event listener when component unmounts
      return () => {
        window.removeEventListener("load", onPageLoad);
      }
    }
  }, [room]);

  function switchMode(mode) {
    switchState(IDLE);
    switch (mode) {
      case EDIT:
        if (!isLogged) {
          toast.error('You must be connected to use edit mode', {
            position: "bottom-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
          });
          return;
        }
        break;

      case VIEW:
        hideSelectionRect();
        break;

      default:
    }

    setCurrentMode(mode);
  }

  function switchState(state) {
    switch (state) {
      case IDLE:
        setCursor('default');
        break;

      case MOVE:
        setCursor('grabbing');
        break;

      case SELECT:
        setCursor('crosshair');
        break;

      case PROMPT:
        setCursor('default');
        break;

      case CHOOSE_TYPE:
        setCursor('default');

        //set rect new position
        if (width < 0) {
          setPosX(posX + width);
          setWidth(Math.abs(width));
        }

        if (height < 0) {
          setPosY(posY + height);
          setHeight(Math.abs(height));
        }
        break;

      default:
    }

    setCurrentState(state);
  }

  //smove camera and set zoom
  function moveCamera(x, y, zoom) {
    setCameraX(x);
    setCameraY(y);
    setCameraZoom(zoom);
  }

  function setSearchParam() {
    setSearchParams(
      createSearchParams({ x: Math.round(cameraX), y: Math.round(cameraY), zoom: Math.round(cameraZoom * 100) })
    );
  }

  // convert coordinates system
  function toGlobalSpace(x, y) {
    x = +cameraX + +x / cameraZoom;
    y = +cameraY + +y / cameraZoom;

    return [x, y]
  }

  function toRelativeSpace(x, y) {
    x = (x - cameraX) * cameraZoom;
    y = (y - cameraY) * cameraZoom;
    return [x, y]
  }

  // true if rectangle a and b overlap
  function overlap(a, b) {
    if (a.x >= b.x + b.w || b.x >= a.x + a.w) return false;
    if (a.y >= b.y + b.h || b.y >= a.y + a.h) return false;
    return true;
  }

  // define a new selection
  function defineSelection(x, y) {
    [x, y] = toGlobalSpace(x, y);

    setPosX(x);
    setPosY(y);
    setWidth(0);
    setHeight(0);
  }

  function hideSelectionRect() {
    setPosX(Number.MAX_SAFE_INTEGER);
    setPosY(Number.MAX_SAFE_INTEGER);
    setWidth(0);
    setHeight(0);
  }

  function addNewPlaceholder(x, y, w, h) {
    var ph = {
      type: 'placeholder',
      x: x,
      y: y,
      w: w,
      h: h
    };

    setPlaceholderList(prevState => {
      var copy = new Map(prevState);
      copy.set(`${x},${y}`, ph);
      return copy;
    });

  }

  function removePlaceholder(x, y) {
    setPlaceholderList(prevState => {
      var copy = new Map(prevState);

      if (copy.has(`${x},${y}`))
        copy.delete(`${x},${y}`);

      return copy;
    });
  }

  function addNewImage(src, x, y, w, h, prompt) {
    var img = {
      type: 'image',
      src: src,
      x: x,
      y: y,
      w: w,
      h: h,
      prompt: prompt
    };

    setImageDivList(prevState => [...prevState, img]);
  }

  function handleDown() {
    switch (currentMode) {
      case VIEW:
        setCamInitX(cursor_pos[0]);
        setCamInitY(cursor_pos[1]);

        switchState(MOVE);
        break;

      case EDIT:
        defineSelection(cursor_pos[0], cursor_pos[1]);
        switchState(SELECT);
        break;

      default:
    }
  }

  function handleMove() {
    switch (currentMode) {
      case VIEW:
        if (currentState === MOVE) {
          var movX = cursor_pos[0] - camInitX;
          var movY = cursor_pos[1] - camInitY;

          setCamInitX(cursor_pos[0]);
          setCamInitY(cursor_pos[1]);

          moveCamera((cameraX - movX / cameraZoom), (cameraY - movY / cameraZoom), cameraZoom);
        }
        break;

      case EDIT:
        if (currentState === SELECT) {
          var w = (cursor_pos[0] / cameraZoom + cameraX - posX);
          var h = (cursor_pos[1] / cameraZoom + cameraY - posY);
          setWidth(w);
          setHeight(h);
        }
        break;

      default:
    }
  }

  function handleUp() {
    switch (currentMode) {
      case VIEW:
        setSearchParam();
        switchState(IDLE);
        break;

      case EDIT:
        if (currentState === SELECT) {
          switchState(CHOOSE_TYPE);
        }
        break;

      default:
    }
  }

  // movement handlers
  const handleTouchDown = (e) => {
    if (e.evt.touches.length === 2) {
      var touch1 = e.evt.touches[0];
      var touch2 = e.evt.touches[1];

      var dist = Math.sqrt(Math.pow(touch1.clientX - touch2.clientX, 2) + Math.pow(touch1.clientY - touch2.clientY, 2))

      setTouchesDist(dist);
      setCameraZoomStart(cameraZoom);
      return;
    }

    var touchposx = e.evt.touches[0].clientX;
    var touchposy = e.evt.touches[0].clientY;
    cursor_pos = [touchposx, touchposy];
    handleDown();
  }

  const handleMouseDown = (e) => {
    cursor_pos = [e.evt.clientX, e.evt.clientY];

    if (e.evt.which === 1) {
      handleDown();
    }
  }

  const handleTouchMove = (e) => {
    if (e.evt.touches.length === 1) {
      var touchposx = e.evt.touches[0].clientX;
      var touchposy = e.evt.touches[0].clientY;
      cursor_pos = [touchposx, touchposy];
      handleMove();
    } else if (e.evt.touches.length === 2) {
      var touch1 = e.evt.touches[0];
      var touch2 = e.evt.touches[1];
      var dist = Math.sqrt(Math.pow(touch1.clientX - touch2.clientX, 2) + Math.pow(touch1.clientY - touch2.clientY, 2))

      var newZoom = cameraZoomStart * (dist / touchesDist)
      
      newZoom = Math.min(newZoom, MAX_ZOOM);
      newZoom = Math.max(newZoom, MIN_ZOOM);

      var zoomCenterX = (touch1.clientX + touch2.clientX) / 2;
      var zoomCenterY = (touch1.clientY + touch2.clientY) / 2;
      var [ax, ay] = toGlobalSpace(zoomCenterX, zoomCenterY);

      moveCamera((ax - zoomCenterX / newZoom), (ay - zoomCenterY / newZoom), newZoom);
    }
  }

  const handleMouseMove = (e) => {
    cursor_pos = [e.evt.clientX, e.evt.clientY];

    handleMove();
  }

  const handleMouseScroll = (e) => {
    if (e.evt.wheelDelta === 0)
      return;

    var newZoom;
    if (e.evt.wheelDelta > 0) {
      newZoom = cameraZoom * CAMERA_ZOOM_SPEED;
    } else {
      newZoom = cameraZoom / CAMERA_ZOOM_SPEED;
    }

    newZoom = Math.min(newZoom, MAX_ZOOM);
    newZoom = Math.max(newZoom, MIN_ZOOM);

    var [ax, ay] = toGlobalSpace(cursor_pos[0], cursor_pos[1]);

    moveCamera((ax - cursor_pos[0] / newZoom), (ay - cursor_pos[1] / newZoom), newZoom);
  }

  const handleTouchUp = (e) => {
    setCameraZoomStart(cameraZoom);
    handleUp();
  }

  const handleMouseUp = (e) => {
    if (e.evt.which === 1) {
      handleUp();
    }
  };

  const cropImageToSelection = () => {
    let image = new window.Image();

    var [x, y] = toRelativeSpace(posX, posY);
    var [w, h] = [width * cameraZoom, height * cameraZoom];

    // the biggest side must be 512px
    var pixelRatio = 512 / Math.max(w, h);

    image.src = imageLayerRef.current.toDataURL({ pixelRatio: pixelRatio });

    let imageSaveInfo = {
      x: x * pixelRatio,
      y: y * pixelRatio,
      w: w * pixelRatio,
      h: h * pixelRatio,
      image: image
    }

    setImageSave(imageSaveInfo);
  }

  const handleClickRefresh = () => {
    setImageDivList([]);

    var url_get_image_with_params = URL_GET_IMAGES + '?posX=0&posY=0&width=100&height=100';

    fetch(url_get_image_with_params).then((data) => data.json())
      .then((json) => json.message)
      .then((images) => Array.from(images).forEach((image) => {
        addNewImage(URL_BUCKET + image.path, image.posX, image.posY, image.width, image.height, image.prompt);
      }));
  };

  const handleStartVm = () => {
    fetch(URL_START_VM).then((data) => alert('VM SARTED'));
  };

  const handleStopVm = () => {
    fetch(URL_STOP_VM).then((data) => alert('VM STOPPED'));
  };

  const handleStatusVm = () => {
    // fetch(URL_STATUS_VM).then(data => data.json()).
    //   then((data) => alert(data.message));
  };

  const handlePromptButtons = (type) => {
    generation_type = type;

    if (type !== "new_image")
      cropImageToSelection();

    if (type === "save") {
      setTimeout(function () { imageSaveRef.current.download(); }, 100);
      return;
    }

    switchState(PROMPT);
  }

  const handleSave = () => {
    cropImageToSelection();

    setTimeout(function () { imageSaveRef.current.download(); }, 100);
  }

  const handleSend = () => {
    var x = Math.floor(posX)
    var y = Math.floor(posY)
    var w = Math.floor(width)
    var h = Math.floor(height)

    var prompt = document.getElementById('prompt_input').value
    document.getElementById('prompt_input').value = ''

    hideSelectionRect();

    var imageParamsDict = {
      'credential': credential,
      'prompt': btoa(prompt),
      'room': room,
      'posX': x,
      'posY': y,
      'width': w,
      'height': h
    }

    if (generation_type === "inpaint_alpha" || generation_type === "img_to_img") {
      var uri = imageSaveRef.current.uri()
      uri = uri.substring(22);
      imageParamsDict['init_image'] = uri;
    }

    var url_function_imagen_with_action = URL_FUNCTION_IMAGEN + '?action=' + generation_type;
    fetch(url_function_imagen_with_action, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(imageParamsDict),
    }).then(handleFetchErrors)

    addNewPlaceholder(x, y, w, h);
  };

  function handleFetchErrors(response) {
    if (!response.ok) {
      toast.error('Error ! Are you connected ?', {
        position: "bottom-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
      console.log(response);
      throw Error(response.statusText);
    }
    return response;
  }

  return (
    <div style={{ cursor: cursor }}>
      <div className="top_button_bar">
        {isLogged === false ? (

          <GoogleLogin //TODO login login
            onSuccess={credentialResponse => {
              console.log(credentialResponse);
              setIsLogged(true);
              setCredential(credentialResponse.credential)
              requests.send_connexion_request(credentialResponse.credential)

            }}
            onError={() => {
              console.log('Login Failed');
            }}
            useOneTap
            auto_select
          //todo add auto login
          />
        ) : (
          <button onClick={() => {
            googleLogout();
            setIsLogged(false);
            setCredential('');
            // todo add logout=1 dans l'url et enlever le automatic login s'il est present
          }}> Logout </button>
        )}

        <button onClick={() => handleClickRefresh()}> Refresh </button>
        <button onClick={() => switchMode(VIEW)}> View </button>
        <button onClick={() => switchMode(EDIT)}> Edit </button>
        <HelpModalButton />
      </div>

      <div className="coords"> {Math.floor(cameraX)}, {Math.floor(cameraY)}, {Math.floor(cameraZoom * 100)} </div>

      <Stage
        ref={stageRef}

        className={"canvas"}

        width={canvasW}
        height={canvasH}

        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleMouseScroll}

        onTouchStart={handleTouchDown}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchUp}
      >

        <Layer ref={imageLayerRef}>
          <Rect
            width={canvasW}
            height={canvasH}
          />

          {
            imageDivList.map((img, i) => {
              var cameraBox = {
                x: cameraX - (window.innerWidth / cameraZoom) * 0.125,
                y: cameraY - (window.innerHeight / cameraZoom) * 0.125,
                w: (window.innerWidth / cameraZoom) * 1.25,
                h: (window.innerHeight / cameraZoom) * 1.25
              }
              if (
                overlap(cameraBox, img)
              ) {
                var [x, y] = toRelativeSpace(img.x, img.y);

                // display image only if the area is > 25px
                if (img.w * cameraZoom * img.h * cameraZoom > 25) {
                  return (
                    <URLImage
                      key={i}
                      src={img.src}
                      x={x}
                      y={y}
                      avg_color={"#FFFADA"}
                      width={img.w * cameraZoom}
                      height={img.h * cameraZoom}
                      prompt={img.prompt}
                      mode={currentMode}
                    />)
                }
              }

            })
          }
        </Layer>

        <Layer>
          {
            Array.from(placeholderList.values()).map((pl, i) => {
              if (!pl) {
                return;
              }

              var [x, y] = toRelativeSpace(pl.x, pl.y);
              return (
                <LoadPlaceholder
                  key={i}
                  x={x}
                  y={y}
                  width={pl.w * cameraZoom}
                  height={pl.h * cameraZoom}
                />)
            })
          }

          {Math.abs(width * cameraZoom * height * cameraZoom) > 100 &&
            <PromptRect
              x={(posX - cameraX) * cameraZoom}
              y={(posY - cameraY) * cameraZoom}
              width={width * cameraZoom}
              height={height * cameraZoom}
              handlePromptButtons={handlePromptButtons}
              handleSend={handleSend}
              handleSave={handleSave}
              currentState={currentState}
              currentMode={currentMode}
            />
          }
        </Layer>

      </Stage>

      {
        imageSave !== null &&
        <ImageSaverLayer ref={imageSaveRef} imageSave={imageSave} />
      }

      <ToastContainer
        position="bottom-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );

}

export default MyCanvas;
