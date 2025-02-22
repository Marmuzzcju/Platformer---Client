//canvas cannot catch keydown events so just wrap that thing inside a button :p
const canvasEventListener = document.querySelector('#game-canvas-event-listener'),
    chat_input = document.querySelector('#chat-input');

function innitialise_game_events(on = true){
    let action = on ? 'addEventListener' : 'removeEventListener';
    console.log('Event listeners: ' + action);

    canvasEventListener[action]('keydown', handle_game_canvas_input);
    
    canvasEventListener[action]('keyup', handle_game_canvas_input);
    
    canvasEventListener[action]('mousemove', handle_game_canvas_input);
    
    canvasEventListener[action]('click', handle_game_canvas_input);
    
    chat_input[action]('keydown', handle_game_chat_input);
    
    canvas.addEventListener('touchstart', handle_game_canvas_input);

    canvas.addEventListener('touchmove', handle_game_canvas_input);

    canvas.addEventListener('touchend', handle_game_canvas_input);

    canvas.addEventListener('touchcancel', handle_game_canvas_input);
}

function innitialise_editor_events(on = true){
    let action = on ? 'addEventListener' : 'removeEventListener';

    canvasEventListener[action]('keydown', handle_editor_input);
    
    canvasEventListener[action]('keyup', handle_editor_input);
    
    canvasEventListener[action]('mousemove', handle_editor_input);
    
    canvasEventListener[action]('click', handle_editor_input);

}

window.addEventListener("resize", (e) => {resizeGameDisplay();});

document.addEventListener("contextmenu", (event) => event.preventDefault());


//mobile controls
let touchEvents = {
    right: {
        origin: {
            x: 0,
            y: 0,
        },
        hasStarted: false,
    },
    left: {
        origin: {
            x: 0,
            y: 0,
        },
        hasStarted: false,
    }
}

function handle_game_canvas_input(e){
    switch(e.type){
        case 'keydown':{
            let oldInput = JSON.stringify(player.input);
            //console.log(e);
            switch(e.keyCode){
                case keybinds.jump:{
                    player.input.jump = true;
                    break;
                }
                case keybinds.stomp:{
                    player.input.stomp = true;
                    break;
                }
                case keybinds.moveLeft:{
                    player.input.mleft = true;
                    break;
                }
                case keybinds.moveRight:{
                    player.input.mright = true;
                    break;
                }
                case keybinds.openChat:{
                    chat_input.focus();
                    document.querySelector('#chat-history').classList.add('opened');
                    break;
                }
                default:{
                    console.log(e.keyCode);
                    inputUpdated = false;
                    break;
                }
            }
            if(JSON.stringify(player.input) != oldInput) sendUpdatedInput();
            break;
        }
        case 'keyup':{
            let oldInput = JSON.stringify(player.input);
            switch(e.keyCode){
                case keybinds.jump:{
                    player.input.jump = false;
                    break;
                }
                case keybinds.stomp:{
                    player.input.stomp = false;
                    break;
                }
                case keybinds.moveLeft:{
                    player.input.mleft = false;
                    break;
                }
                case keybinds.moveRight:{
                    player.input.mright = false;
                    break;
                }
                default:{
                    console.log(e.keyCode);
                    break;
                }
            }
            if(JSON.stringify(player.input) != oldInput) sendUpdatedInput();
            break;
        }
        case 'mousemove':{  
            //update player's aim position
            //console.log(e);

            player.data.realAimPosition = [e.offsetX - canvas.width / 2, e.offsetY - canvas.height / 2];
            break;
        }
        case 'click':{  
            console.log(e);
            switch(e.button){
                case 0:{
                    //attack
                    /*let delta = [e.pageX - canvas.width / 2, e.pageY - canvas.height / 2],
                        length = (delta[0]**2+delta[1]**2)**.5,
                        normalFactor = 1 / length,
                        normal_attack_vector = [delta[0]*normalFactor, delta[1]*normalFactor];*/
                    handle_player_attack();
                    break;
                }
            }
            break;
        }
        case 'touchstart':{
            console.log(e);
            let h = canvas.height,
                w = canvas.width,
                touchY = h - e.touches[0].pageY,
                touchX = e.touches[0].pageX;
            if((touchX < w / 2 && !touchEvents.right.hasStarted) || (touchX > w / 2 && touchEvents.left.hasStarted)){
                //right touch
                touchEvents.right.hasStarted = true;
                touchEvents.right.origin = {x:touchX, y:touchY};
            } else {
                touchEvents.left.hasStarted = true;
                touchEvents.left.origin = {x:touchX, y:touchY};
            }
            mobileControl.origin.x = touchX;
            mobileControl.origin.y = touchY;
            mobileControl.current.x = touchX;
            mobileControl.current.y = touchY;
            mobileControl.isMoving = true;
            break;
        }
        case 'touchmove':{
            let oldInput = JSON.stringify(player.input);
            //console.log(e);
            let h = canvas.height,
                touchY = h - e.touches[0].pageY;
            mobileControl.current.x = e.touches[0].pageX;
            mobileControl.current.y = touchY;
            let deltaX = e.touches[0].pageX - mobileControl.origin.x,  // >0: right; <0: left
                deltaY = touchY - mobileControl.origin.y,  // >0: down; <0: up
                distance = (deltaX**2+deltaY**2)**.5;
            if(distance > 50){
                //move origin
                let VectorOC = [mobileControl.current.x-mobileControl.origin.x,mobileControl.current.y-mobileControl.origin.y],
                    partian = (distance - 50) / distance;
                mobileControl.origin.x += VectorOC[0] * partian;
                mobileControl.origin.y += VectorOC[1] * partian;
            }
            player.input.mleft = deltaX < -20;
            player.input.mright = deltaX > 20;
            player.input.jump = deltaY > 20;
            player.input.stomp = deltaY < -20;
            console.log(`Delty X: ${deltaX}; - Y: ${deltaY}`);
            if(JSON.stringify(player.input) != oldInput) sendUpdatedInput();
            break;
        }
        case 'touchend':
        case 'touchcancel':{
            let oldInput = JSON.stringify(player.input);
            console.log(e);
            player.input.jump = false;
            player.input.stomp = false;
            player.input.mleft = false;
            player.input.mright = false;
            mobileControl.isMoving = false;
            if(JSON.stringify(player.input) != oldInput) sendUpdatedInput();
            break;
        }
    }
}

function handle_game_chat_input(e){
    switch(e.type){
        case 'keydown':{     
            if(e.keyCode == keybinds.openChat){
                canvasEventListener.focus();
                document.querySelector('#chat-history').classList.remove('opened');
                let message = chat_input.value;
                if(message.length){
                    //send message
                    pushChatMessage('You', message);
                    send_message('Chat', message);
                    chat_input.value = '';
                }
            }
            break;
        }
    }
}

function handle_editor_input(e){
    switch(e.type){
        case 'keydown':{
            //console.log(e);
            switch(e.keyCode){
                case keybinds.jump:{
                    player.input.jump = true;
                    break;
                }
                case keybinds.stomp:{
                    player.input.stomp = true;
                    break;
                }
                case keybinds.moveLeft:{
                    player.input.mleft = true;
                    break;
                }
                case keybinds.moveRight:{
                    player.input.mright = true;
                    break;
                }
            }
            break;
        }
        case 'keyup':{
            switch(e.keyCode){
                case keybinds.jump:{
                    player.input.jump = false;
                    break;
                }
                case keybinds.stomp:{
                    player.input.stomp = false;
                    break;
                }
                case keybinds.moveLeft:{
                    player.input.mleft = false;
                    break;
                }
                case keybinds.moveRight:{
                    player.input.mright = false;
                    break;
                }
            }
            break;
        }
        case 'mousemove':{
            player.data.realAimPosition = [e.offsetX, e.offsetY];
            break;
        }
        case 'click':{  
            console.log(e);
            switch(e.button){
                case 0:{
                    //place block ig
                    editor_modify_cells();
                    break;
                }
            }
            break;
        }

    }
}

