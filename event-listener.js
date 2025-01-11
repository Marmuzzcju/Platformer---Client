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
    mobileControl.origin.x = e.touches[0].pageX;
    mobileControl.origin.y = e.touches[0].pageY;
    mobileControl.current.x = e.touches[0].pageX;
    mobileControl.current.y = e.touches[0].pageY;
    mobileControl.isMoving = true;
});
document.addEventListener('touchmove', e => {
    let oldInput = JSON.stringify(player.input);
    //console.log(e);
    mobileControl.current.x = e.touches[0].pageX;
    mobileControl.current.y = e.touches[0].pageY;
    let deltaX = e.touches[0].pageX - mobileControl.origin.x,  // >0: right; <0: left
        deltaY = e.touches[0].pageY - mobileControl.origin.y,  // >0: down; <0: up
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
    player.input.jump = deltaY < -20;
    player.input.stomp = deltaY > 20;
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
    mobileControl.isMoving = false;
    if(JSON.stringify(player.input) != oldInput) sendUpdatedInput();
});
document.addEventListener('touchcancel', e => {
    let oldInput = JSON.stringify(player.input);
    console.log(e);
    player.input.jump = false;
    player.input.stomp = false;
    player.input.mleft = false;
    player.input.mright = false;
    mobileControl.isMoving = false;
    if(JSON.stringify(player.input) != oldInput) sendUpdatedInput();
});