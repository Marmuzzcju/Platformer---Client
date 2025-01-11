//hello
document.addEventListener('keydown', e => {
    let oldInput = JSON.stringify(player.input);
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
        default:{
            console.log(e.keyCode);
            inputUpdated = false;
            break;
        }
    }
    if(JSON.stringify(player.input) != oldInput) sendUpdatedInput();
});
document.addEventListener('keyup', e => {
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
});

window.addEventListener("resize", (e) => {resizeGameDisplay();});

document.addEventListener("contextmenu", (event) => event.preventDefault());


//modile controls
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
document.addEventListener('touchstart', e => {
    console.log(e);
    touchEvents.right.origin.x = e.touches[0].pageX;
    touchEvents.right.origin.y = e.touches[0].pageY;
    //touchEvents.right.hasStarted = true;
});
document.addEventListener('touchmove', e => {
    let oldInput = JSON.stringify(player.input);
    //console.log(e);
    let deltaX = e.touches[0].pageX - touchEvents.right.origin.x,  // >0: right; <0: left
        deltaY = e.touches[0].pageY - touchEvents.right.origin.y;  // >0: down; <0: up
    player.input.mleft = deltaX < -10;
    player.input.mright = deltaX > 10;
    player.input.jump = deltaY < -10;
    player.input.stomp = deltaY > 10;
    console.log(`Delty X: ${deltaX}; - Y: ${deltaY}`);
    if(JSON.stringify(player.input) != oldInput) sendUpdatedInput();
});
document.addEventListener('touchend', e => {
    let oldInput = JSON.stringify(player.input);
    console.log(e);
    player.input.jump = false;
    player.input.stomp = false;
    player.input.mleft = false;
    player.input.mright = false;
    if(JSON.stringify(player.input) != oldInput) sendUpdatedInput();
});
document.addEventListener('touchcancel', e => {
    let oldInput = JSON.stringify(player.input);
    console.log(e);
    player.input.jump = false;
    player.input.stomp = false;
    player.input.mleft = false;
    player.input.mright = false;
    if(JSON.stringify(player.input) != oldInput) sendUpdatedInput();
});