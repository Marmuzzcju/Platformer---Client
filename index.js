console.log('Hello World!');

const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d');
const seperator_key = ';\$/;';

const data = {
    peer: {},
    connection: {},
}

function open_peer(){
    let peer = new Peer();
    peer.on('open', function(id) {
        console.log('My peer ID is: ' + id);
    });
    data.peer = peer;
}

function connect_server(provided_server_id){
    let server_id = provided_server_id;
    if(!server_id){
        let input_id = document.querySelector('#input-server-id').value;
        if(input_id.length < 28) return;
        //length should be 36 but may vary idk so 28 should be a safezone
        server_id = input_id;
    }
    console.log(`Trying to connect to: ${server_id}`);
    let conn = data.peer.connect(server_id);
    conn.on('open', function() {
        console.log('Connection openned successful');
        conn.on('data', function(data) {
          // Receive messages here
          //console.log('Received', data);
          handle_server_message(data);
        });
        // Send messages
        conn.send('Hello!');
        data.connection = conn;
        //start client game
        startGame();
    });
}
 
function page_config(){
    open_peer();
}

function send_message(action, messageData){
    if(!data?.connection?.send) return;
    console.log('Sending smth to server...');
    let message = `${action}${seperator_key}${messageData}`
    data.connection.send(message);
}

function handle_server_message(data){
    switch(data.split(seperator_key)[0]){
        case 'New_user':{
            console.log('New User Joined!!!');
            let Data = JSON.parse(data.split(seperator_key)[1]);
            Data.forEach(u => {
                let values = {position:u.position,name:u.name,id:u.id};
                createCharacter('player',values);
            });
            break;
        }
        case 'Update_self':{
            let sendData = data.split(seperator_key)[1];
            console.log(sendData);
            let Data = JSON.parse(sendData);
            player.data.position = Data.position;
            player.data.velocity = Data.velocity;
            player.data.forces = Data.forces;
            player.data.health = Data.health;
            player.data.movementControl = Data.movementControl;
            player.data.id = Data.id;
            /*
            player.data.isGrounded = Data.isGrounded;
            player.data.isJumping = Data.isJumping;
            player.data.isStomping = Data.position;
            */
            break;
        }
        case 'Map_data':{
            //reset/update map to send map
            let mapData = JSON.parse(data.split(seperator_key)[1]);
            map.blocks = mapData.blocks;
            map.height = mapData.height;
            map.width = mapData.width;
            createMapHitboxes();
            break;
        }
        case 'Update_game_state':{
          //"game frame" - update most if not all
          let receivedData = JSON.parse(data.split(seperator_key)[1]);
          receivedData.forEach(p => {
            if(p.id != player.data.id){
                characters.players.forEach(cp => {
                    if(cp.id == p.id){
                        cp.position = p.position;
                        cp.velocity = p.velocity;
                        cp.input = p.input;
                    }
                })
            } else {
                //check if position is same as position x frames ago where x ~ user ping
            }
          })
          break;
        }
    }
}

function sendUpdatedInput(){
    let action = 'Player_input';
    let data = JSON.stringify(player.input);
    send_message(action, data);
}

page_config();

const keybinds = {
    jump: 87,
    stomp: 83,
    moveLeft: 65,
    moveRight: 68,
}

let playerId = 0, idTable = {};
const characters = {
    players: [],
    //mobs: [{type:'fang',status:'lurk',focusTime:1,target:0,position:{x:8,y:2},sting:{pos:{x:8,y:2},speed:20,damage:10},reach:7}],
}
//store all players inside characters, then store player controlled by user inside player.data for easier access
let player = {
    data:{},
    input:{
        jump:false,
        stomp:false,
        mleft:false,
        mright:false,
    },
};
let mobileControl = {
    isMoving: false,
    origin: {
        x: 0,
        y: 0,
    },
    current: {
        x: 0,
        y: 0,
    }
}

//animation data
const animationData = {
    animations: [],
    lastPlayerHealth: 100,
    lastDamageTick: 0,
};

//adjust with device size
let UNIT_WIDTH = 50;

let gameIsRunning = false;

let frameDelta = 0;
let lastTimestamp = new Date().getTime();

const map = {
    width: 16,
    height: 9,
    blocks: [
        {x:9,y:8},
        {x:9,y:7},
        {x:8,y:8},
        {x:8,y:7},
        {x:10,y:3},
        {x:6,y:5},
        {x:5,y:5},
        {x:12,y:-1},
        {x:14,y:-5},
        {x:11,y:-5},
        {x:11,y:-8},
        {x:11,y:-11},
        {x:11,y:-14},
        {x:11,y:-17},
        {x:11,y:-19},
        {x:13,y:3},
        {x:17,y:0},
        {x:18,y:0},
        {x:18,y:1},
        {x:18,y:2},
        {x:18,y:3},
        {x:17,y:3},
        {x:-5,y:6},
        {x:-6,y:6},
        {x:-7,y:6},
        {x:-7,y:4},
        {x:-6,y:4},
        {x:-6,y:3},
        {x:-6,y:2},
        {x:-6,y:1},
        {x:-6,y:0},
        {x:-6,y:-1},
    ],
}
const hitboxes = {
    downFlow: [],
    upFlow: [],
    rightFlow: [],
    leftFlow: [],
}

const debuging = {
    showHitboxFlows: false,
    showScreenSplit: true,
    showInputControl: false,
}

function createMapHitboxes(){
    //clear old hitboxes
    hitboxes.downFlow = [];
    hitboxes.upFlow = [];
    hitboxes.leftFlow = [];
    hitboxes.rightFlow = [];


    let protoJointHitboxes = {
        up : {},
        down : {},
        left : {},
        right : {},
    };
    //get all hitbox-flows
    let identifier = ['up','down','left','right'];
    map.blocks.forEach(block => {
        let position = [block.y+1,block.y,block.x+1,block.x];
        for(let c=0;c<4;c++){
            let protoHit = protoJointHitboxes[identifier[c]],
                id = position[c],
                axisPosition = c < 2 ? block.x : block.y;
            if(Array.isArray(protoHit[id])){
                protoHit[id].push(axisPosition);
            } else protoHit[id] = [axisPosition];
        }
    });

    console.log(protoJointHitboxes);

    //unify adjecent hitbox-flows
    let unifiedProtoJointHitboxes = {
        up : {},
        down : {},
        left : {},
        right : {},
    };
    for(let c=0;c<4;c++){
        Object.entries(protoJointHitboxes[identifier[c]]).forEach(row => {
            row[1].sort((a, b) => {return a-b;});
            let realFlow = [];
            row[1].forEach(hitFlow => {
                let lastFlow = realFlow.at(-1);
                if(!lastFlow || (lastFlow[c<2?'x':'y'] + lastFlow.w < hitFlow)){
                    realFlow.push({[c<2?'x':'y']: hitFlow, w: 1});
                } else lastFlow.w++;
            });
            unifiedProtoJointHitboxes[identifier[c]][row[0]] = realFlow;
        });
    }

    console.log(unifiedProtoJointHitboxes);

    //remove unreachable hitflows
    for(let c=0;c<4;c+=2){
        let xy = c < 2 ? 'x' : 'y';
        Object.entries(unifiedProtoJointHitboxes[identifier[c]]).forEach(row => {
            let correspondingRow = unifiedProtoJointHitboxes[identifier[c+1]][row[0]];
            if(correspondingRow){
                //only if hitflows exist on that row
                //go through hitflows one-by-one, check which can be removed
                let unnecessaryFlows = [];
                row[1].forEach((hit, idx) => {
                    let unnecessaryCorFlows = [];
                    let s = hit[xy], e = s + hit.w;
                    //check if any hitflow fully covers that / this covers any other hitflow fully
                    correspondingRow.forEach(cHit => {
                        if(cHit[xy] <= s && cHit[xy] + cHit.w >= e){
                            //hitflow fully covered; can be removed
                            unnecessaryFlows.push(idx);
                        }
                        if(cHit[xy] >= s && cHit[xy] + cHit.w <= e){
                            //corresponding hitflow fully covered; can be removed
                            unnecessaryCorFlows.push(idx);
                        }
                    });
                    unnecessaryCorFlows.forEach((idx, c) => {
                        correspondingRow.splice(idx-c,1);
                    });
                });
                unnecessaryFlows.forEach((idx,c)=>{
                    row[1].splice(idx-c,1);
                });
            }
        });
    }

    console.log(unifiedProtoJointHitboxes);

    //write new hitboxes into global hitbox flow
    let globalIdentifier = ['upFlow','downFlow','leftFlow','rightFlow'];
    for(let c=0;c<4;c++){
        let x = c < 2 ? 'x' : 'y', y = c < 2 ? 'y' : 'x';
        Object.entries(unifiedProtoJointHitboxes[identifier[c]]).forEach(row => {
            row[1].forEach(hitflow => {
                hitboxes[globalIdentifier[c]].push({[x]:hitflow[x],[y]:Number(row[0]),w:hitflow.w});
            });
        });

    }

}
createMapHitboxes();


canvas.width = map.width * UNIT_WIDTH;
canvas.height = map.height * UNIT_WIDTH;

const camera = {
    offSet : {
        x : 15.5,
        y : 8.5,
    },
    position : {
        x : 0,
        y : 0,
    },
    lerp : .5**9,
}

const AGM = { //artificial game modification e.g. debuging
    forceFramerate : false,
    framerate : 60,
};

const randInt = (min, max) => Math.floor(Math.random()*(max-min)) + min;

const dist = (a,b) => ((a.x-b.x)**2+(a.y-b.y)**2)**.5;

const lerp = (c,t,f) => c+(t-c)*f;
const lerp2d = (c,t,f) => {return {x:c.x+(t.x-c.x)*f,y:c.y+(t.y-c.y)*f}};

const relTC = {
    x : (val) => (val + camera.offSet.x - camera.position.x) * UNIT_WIDTH,
    y : (val) => (val + camera.offSet.y - camera.position.y) * UNIT_WIDTH,
}

function resizeGameDisplay(setUnitSize){//usually undefined
    let [wW,wH] = [window.innerWidth,window.innerHeight]
    canvas.width = wW;
    canvas.height = wH;
    UNIT_WIDTH = setUnitSize ?? (wW/wH < 16/9 ? wH/18 : wW / 32);
    camera.offSet = {x:(wW/UNIT_WIDTH/2)-.5,y:(wH/UNIT_WIDTH/2)-.5};
    //ratio: 32:18
    //totall size: 576
}

//--Game Loop Start--

function gameLoop(){
    if(gameIsRunning){
        if(!AGM.forceFramerate)window.requestAnimationFrame(gameLoop);
        else setTimeout(()=>{gameLoop();},1/AGM.framerate*1000);
    }
    
    let timestamp = new Date().getTime();
    frameDelta = (timestamp - lastTimestamp)/1000;  //frameDelta in seconds
    frameDelta = frameDelta > 500 ? 500 : frameDelta;  //prevent big delta when switching tabs - will be improved later
    drawBackground();
    updateCharacters();
    drawEverything();
    lastTimestamp = timestamp;
}

//update players & mobs
function updateCharacters(){
    handlePlayerInput();
    updatePlayers();
    updateCamera();//note: only for testing rn
    //updateMobs();
}

//handle user input, move player etc.
function handlePlayerInput(){
    if(player.input.jump && (player.data.isGrounded || player.data.coyoteTimer < .1) && !player.data.isJumping){
        console.log('Jump!!');
        player.data.velocity.y -= 25 * player.data.movementControl;//arbitrary number for now, will be changed later on
        player.data.isGrounded = false;
        player.data.isJumping = true;
        player.data.coyoteTimer = 5;
    } else {
        if(player.data.isJumping) {
        player.data.isJumping = player.data.velocity.y > 0 ? false : player.input.jump;
        }
        player.data.isStomping = !!(player.data.isStomping || (!player.input.jump && player.input.stomp));
    }
    player.data.velocity.x += ((player.input.mright-player.input.mleft) * 5 - player.data.velocity.x) * player.data.movementControl;//3: arbitrary as well
}

//update player positions
function updatePlayers(){
    characters.players.forEach(p => {
        p.velocity.y += p.isGrounded ? 0 : p.isJumping ? 25*frameDelta : p.isStomping ? (35-p.velocity.y)*p.movementControl : (p.velocity.y+40*frameDelta) > 30 ? 30-p.velocity.y : 40*frameDelta;
        p.isGrounded = false;
        if(p.velocity.x > 0) {
            let free = true;
            hitboxes.rightFlow.forEach(b => {
                //check if: 1. has not stopped yet; 2. y-coords overlap; 3. is in front; 4. would hit
                if(free && Math.abs(b.y+b.w/2 - p.position.y-.5) < (b.w+1)/2 && p.position.x+1 <= b.x &&  b.x - p.position.x - 1 < p.velocity.x*frameDelta) {
                    //console.log('!!!OOKK!!!');
                    free = false;
                    p.position.x = b.x-1;
                    p.velocity.x = 0;
                };
            });
        } else if (p.velocity.x < 0) {
            let free = true;
            hitboxes.leftFlow.forEach(b => {
                if(free && Math.abs(b.y+b.w/2 - p.position.y-.5) < (b.w+1)/2 && p.position.x >= b.x &&  p.position.x - b.x < -p.velocity.x*frameDelta) {
                    //console.log('!!!OOKK!!!');
                    free = false;
                    p.position.x = b.x;
                    p.velocity.x = 0;
                };
            });
        }
        p.position.x += p.velocity.x*frameDelta;
        if(p.velocity.y > 0) {
            let free = true;
            hitboxes.downFlow.forEach(b => {
                if(free && Math.abs(b.x+b.w/2 - p.position.x-.5) < (b.w+1)/2 && p.position.y+1 <= b.y && b.y - p.position.y - 1 < p.velocity.y*frameDelta) {
                    //console.log('Stopped DOWN');
                    stopX = true;
                    p.position.y = b.y-1;
                    p.velocity.y = 0;
                    p.isGrounded = true;
                    p.isStomping = false;
                }
            });
        } else if (p.velocity.y < 0) {
            let free = true;
            hitboxes.upFlow.forEach(b => {
                if(free && Math.abs(b.x+b.w/2 - p.position.x-.5) < (b.w+1)/2 && p.position.y >= b.y && p.position.y - b.y < -p.velocity.y*frameDelta) {
                    //console.log('Stopped UPP');
                    stopX = true;
                    p.position.y = b.y;
                    p.velocity.y = 0;
                }
            });
        }
        p.position.y += p.velocity.y*frameDelta;
        p.velocity.y += p.isJumping ? 25*frameDelta : 40*frameDelta;
        if(p.position.y+1 >= map.height){
            //console.log('ON THE FRICKING GROUND');
            p.position.y = map.height-1;
            p.velocity.y = 0;
            p.isGrounded = true;
            p.isStomping = false;
        }
        p.coyoteTimer = p.isGrounded ? 0 : p.coyoteTimer+frameDelta;
    });
};

//update mobs position
function updateMobs(){
    characters.mobs.forEach(mob => {
        switch(mob.status){
            case 'lurk':{
                characters.players.forEach(p => {
                    if(p.position.y>mob.position.y){
                        if(((p.position.y-mob.position.y)**2+(p.position.x-mob.position.x)**2)**.5 < mob.reach){
                            //player in reach - innitiate attack
                            mob.status = 'aiming';
                            mob.focusTime = 2;
                            mob.target = p.id;
                            ctx.beginPath();
                            ctx.strokeStyle = 'red';
                            ctx.moveTo(relTC.x(mob.position.x+.5),relTC.y(mob.position.y+.5));
                            ctx.lineTo(relTC.x(p.position.x+.5),relTC.y(p.position.y+.5));
                            ctx.stroke();
                        }
                    }
                });
            }
            case 'aiming':{
                let t = characters.players[idTable[mob.target]];
                if(t.position.y>mob.position.y && ((t.position.y-mob.position.y)**2+(t.position.x-mob.position.x)**2)**.5 < mob.reach){
                    //player still in reach
                    mob.focusTime -= frameDelta;
                    ctx.beginPath();
                    ctx.strokeStyle = `rgb(${255*mob.focusTime/2},${255*(2-mob.focusTime)/2},0)`;
                    ctx.moveTo(relTC.x(mob.position.x+.5),relTC.y(mob.position.y+.5));
                    ctx.lineTo(relTC.x(t.position.x+.5),relTC.y(t.position.y+.5));
                    ctx.stroke();
                    if(mob.focusTime<=0){
                        mob.status = 'attack-1';
                    }
                } else {
                    mob.status = 'lurk';
                }
                break;
            }
            case 'attack-1':{
                let target = characters.players[idTable[mob.target]], sting = mob.sting, f = (sting.speed*frameDelta)/dist(target.position,sting.pos);
                if(f>=1){
                    [sting.pos.x,sting.pos.y]=[target.position.x,target.position.y];
                    console.log('HIT!!');
                    applyDamage(target, sting.damage, 0);
                    //target.movementControl /= 4;
                    mob.status = 'attack-2';
                } else {
                    console.log(`attacking - d:${dist(target.position,sting.pos)}`);
                    sting.pos = lerp2d(sting.pos,target.position,f);
                    ctx.beginPath();
                    ctx.lineWidth = 5;
                    ctx.strokeStyle = `rgb(0,120,0)`;
                    ctx.moveTo(relTC.x(mob.position.x+.5),relTC.y(mob.position.y+.5));
                    ctx.lineTo(relTC.x(sting.pos.x+.5),relTC.y(sting.pos.y+.5));
                    ctx.stroke();
                    ctx.lineWidth = 1;
                }
                break;
            }
            case 'attack-2':{
                let target = characters.players[idTable[mob.target]], sting = mob.sting;
                sting.pos = target.position;
                //let f = (sting.speed*frameDelta)/dist(mob.position,sting.pos);
                //target.velocity.x += mob.position.x > target.position.x ? 1 : -1;
                //target.velocity.y += mob.position.y > target.position.y ? 1 : -1;
                break;
            }
        }
    })
};

function applyDamage(target, damage, type){
    //later add damage types & dmg resistance...
    target.health -= damage;
    if(target.health<=0) console.log('Target down!');
    //if hurt character is player: update damage animation
    if(target.id == player.data.id) animationData.lastDamageTick = 0;
}

//move camera towards player
function updateCamera(){
    camera.position.x += (player.data.position.x - camera.position.x) * (1-(camera.lerp**frameDelta));
    camera.position.y += (player.data.position.y - camera.position.y) * (1-(camera.lerp**frameDelta));
    //camera.lerp += camera.lerp < 120 ? frameDelta : 0;
}

function updateLerp(newLerp){
    camera.lerp = newLerp;
    document.querySelector('#slide-lerp').value=newLerp**(1/9);
    document.querySelector('#input-lerp').value=(newLerp**(1/9)).toFixed(2);
    document.querySelector('#realLerp').value=newLerp.toFixed(6);
}

//draw function to call once per frame
function drawEverything(){
    //drawBackground();
    drawMap();
    drawPlayers();
    drawAnimations();
    drawDebug();
}
//draws background
function drawBackground(){
    ctx.fillStyle = 'black';
    ctx.fillRect(0,0,canvas.width,canvas.height);
}
//draws map details such as blocks
function drawMap(){
    ctx.fillStyle = 'green';
    map.blocks.forEach(block => {
        ctx.fillRect(relTC.x(block.x),relTC.y(block.y),UNIT_WIDTH,UNIT_WIDTH);
    });
    ctx.strokeStyle = 'blue';
    ctx.strokeRect(relTC.x(0),relTC.y(0),map.width*UNIT_WIDTH,map.height*UNIT_WIDTH)
}
//draw players, mobs etc.
function drawPlayers(){
    ctx.fillStyle = 'red';
    characters.players.forEach(p => {
        ctx.fillRect(relTC.x(p.position.x),relTC.y(p.position.y),UNIT_WIDTH,UNIT_WIDTH);
    });

    /*ctx.fillStyle = 'lime';
    characters.mobs.forEach(mob => {
        ctx.fillRect(relTC.x(mob.position.x),relTC.y(mob.position.y),UNIT_WIDTH,UNIT_WIDTH);
    })*/
}
//draw animations, particles etc.
function drawAnimations(){
    //player health
    let pH = player.data.health;
    ctx.strokeStyle = 'grey';
    ctx.strokeRect(canvas.width/2-151,canvas.height-141,302,22);
    ctx.fillStyle = `rgba(${100+1.5*pH},${1.5*pH},0,${1-animationData.lastDamageTick})`;
    ctx.fillRect(canvas.width/2-150,canvas.height-140,300*animationData.lastPlayerHealth/100,20);
    ctx.fillStyle = `rgb(${150*(80-pH)},${3*pH},0)`;
    ctx.fillRect(canvas.width/2-150,canvas.height-140,300*pH/100,20);
    if(animationData.lastPlayerHealth!=pH) animationData.lastDamageTick += frameDelta;
    if(animationData.lastDamageTick>=1) animationData.lastPlayerHealth = pH;

    //mobile joystick
    if(mobileControl.isMoving){
        let o = mobileControl.origin,
            c = mobileControl.current;
        ctx.fillStyle = 'rgba(110,110,110,.7)';
        ctx.strokeStyle = 'rgba(110,110,110,.7)';
        ctx.beginPath();
        ctx.arc(c.x,c.y,20,0,2*Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(o.x,o.y,50,0,2*Math.PI);
        ctx.stroke();
    }
}

//draw debugging stuff such as middle cross
function drawDebug(){
    if(debuging.showHitboxFlows){
        ctx.strokeStyle = 'red';
        //ctx.lineWidth = 15;
        ctx.beginPath();
        hitboxes.downFlow.forEach(dF => {
            ctx.moveTo(relTC.x(dF.x),relTC.y(dF.y));
            ctx.lineTo(relTC.x(dF.x+dF.w),relTC.y(dF.y));
        });
        hitboxes.upFlow.forEach(dF => {
            ctx.moveTo(relTC.x(dF.x),relTC.y(dF.y));
            ctx.lineTo(relTC.x(dF.x+dF.w),relTC.y(dF.y));
        });
        hitboxes.rightFlow.forEach(dF => {
            ctx.moveTo(relTC.x(dF.x),relTC.y(dF.y));
            ctx.lineTo(relTC.x(dF.x),relTC.y(dF.y+dF.w));
        });
        hitboxes.leftFlow.forEach(dF => {
            ctx.moveTo(relTC.x(dF.x),relTC.y(dF.y));
            ctx.lineTo(relTC.x(dF.x),relTC.y(dF.y+dF.w));
        });
        ctx.stroke();
    }
    if(debuging.showScreenSplit){
        ctx.strokeStyle = 'rgba(70,140,140,0.5)';
        //ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(canvas.width/2,0);
        ctx.lineTo(canvas.width/2,canvas.height);
        ctx.moveTo(0,canvas.height/2);
        ctx.lineTo(canvas.width,canvas.height/2);
        ctx.stroke();
    }
    if(debuging.showInputControl){
        ctx.fillStyle = player.input.jump ? 'green' : 'red';
        ctx.fillRect(230,30,50,50);
        ctx.fillStyle = player.data.isJumping ? 'green' : 'red';
        ctx.fillRect(300,30,50,50);
        ctx.fillStyle = player.input.stomp ? 'green' : 'red';
        ctx.fillRect(230,100,50,50);
        ctx.fillStyle = player.data.isStomping ? 'green' : 'red';
        ctx.fillRect(300,100,50,50);
    }
}

//--Game Loop End--

function createCharacter(type, values){
    //returning optional index on where the new character has been pushed to the corresponding array
    let idx = 0;
    switch(type){
        case 'player':{
            let player = {
                position: values?.position ?? {x:0,y:0},
                velocity: values?.velocity ?? {x:0,y:0},
                forces: values?.forces ?? {x:0,y:1},
                health: values?.health ?? 100,
                isGrounded: true,
                isJumping: false,
                isStomping: false,
                movementControl: 1,
                coyoteTimer: 0,
                name: values?.name ?? 'Player',
                id: values?.id ?? playerId,
            };
            idx = characters.players.length;
            idTable[playerId] = idx;
            //note: on player death/leave etc. has to be updated
            playerId++;
            characters.players.push(player);
            break;
        }
        default:{
            console.log(`Error while creating character: '${type}' is an unknown character type`);
            break;
        }
    }
    return idx;
}

function startGame(){
    console.log('Starting...');
    document.querySelector('#start-menu').style.display = 'none';
    document.querySelector('#menu').style.display = 'inline';
    let name = document.querySelector('#input-nickname').value;
    let idx = createCharacter('player',{name:name});
    player.data = characters.players[idx];
    resizeGameDisplay();
    gameIsRunning=true;
    gameLoop();
}


// -- UI functions --

function fadeMenu(fade, step){
    if(fade){
        document.querySelector('#menu').style.transform = 'scale(0)';
        document.querySelector('#show-menu').style.opacity = 1;
    } else {
        document.querySelector('#menu').style.transform = 'scale(1)';
        document.querySelector('#show-menu').style.opacity = 0;
    }
}