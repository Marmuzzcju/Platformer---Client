console.log('Hello World!');

const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d');
const seperator_key = ';\$/;';

const data = {
    id: 0,
    peer: {},
    connection: {},
}

let has_local_storage = false,
    is_dev = false,
    is_offline = true;

function open_peer(){
    let peer = new Peer();
    peer.on('open', function(id) {
        console.log('My peer ID is: ' + id);
        data.id = id;
        is_offline = false;
    });
    peer.on('error', (e) => {
        console.log('Error:');
        console.log(e);
        data.id = 1;
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
        let username = document.querySelector('#input-nickname').value;
        conn.send(`Hello${seperator_key}${username}`);
        data.connection = conn;
        //start client game
        startGame();
    });
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
        case 'User_update':{
            console.log('Received User update :D')
            let user = JSON.parse(data.split(seperator_key)[1]);
            characters.players = [characters.players[0]];
            user.forEach(u => {
                characters.players.push(u);
            });
            break;
        }
        case 'Map_data':{
            //reset/update map to send map
            let mapData = JSON.parse(data.split(seperator_key)[1]);
            map.blocks = mapData.blocks;
            map.height = mapData.height;
            map.width = mapData.width;
            
            /*//this is called once as the user connects so tell the server your name now
            let name = document.querySelector('#input-nickname').value ?? 'Player';
            send_message('My_name', name);*/

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
                        cp.name = p.name;
                    }
                })
            } else {
                //check if position is same as position x frames ago where x ~ user ping
            }
          })
          break;
        }
        case 'Projectile':{
            //here
            projectiles.push(JSON.parse(data.split(seperator_key)[1]));
            break;
        }
        case 'Projectile_hit':{
            //here
            let temp = data.split(seperator_key)[1].split(','),
                projectile = temp[0],
                player = temp[1];
            characters.players.forEach(p => {
                if(p.id == player){
                    applyDamage(p, 10, 0);
                }
            });
            projectiles.splice(projectile, 1);
            break;
        }
        case 'Chat':{
            //push new chat message
            let dm = data.split(seperator_key),
                author = dm[1],
                message = dm[2];
            pushChatMessage(author, message);
        }
    }
}

function sendUpdatedInput(){
    let action = 'Player_input';
    let input = JSON.stringify(player.input),
        position = JSON.stringify(player.data.position);
    send_message(action, `${input}${seperator_key}${position}`);
}


const keybinds = {
    jump: 87,
    stomp: 83,
    moveLeft: 65,
    moveRight: 68,
    openChat: 13,
}

let playerId = 0, idTable = {};
const characters = {
    players: [],
    //mobs: [{type:'fang',status:'lurk',focusTime:1,target:0,position:{x:8,y:2},sting:{pos:{x:8,y:2},speed:20,damage:10},reach:7}],
}
const projectiles = [];
//store all players inside characters, then store player controlled by user inside player.data for easier access
let player = {
    data:{
        realAimPosition: [0,0],
    },
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

const chat_history = document.querySelector('#chat-history');

//sprites
const img = {
    player: new Image(),
    blowpipe: new Image(),
    dart: new Image(),
    block: new Image(),
    tile_set: new Image(),
};
img.player.src = 'imgs/Player3_Standing.png';
img.blowpipe.src = 'imgs/Blasrohr_16x5.png';
img.dart.src = 'imgs/Projektil_7x3.png';
img.block.src = 'imgs/Block_all_surrounded.png';
img.tile_set.src = 'imgs/Tile-set_Blocke_128x128.png';

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

let frame_count = 0;

const map = {
    width: 64,
    height: 36,
    cells: [    ],
    blocks: [
        {x:9,y:0},
        {x:9,y:1},
        {x:8,y:0},
        {x:8,y:1},
        {x:10,y:3},
        {x:6,y:2},
        {x:5,y:2},
        {x:12,y:9},
        {x:11,y:8},
        {x:14,y:12},
        {x:11,y:12},
        {x:11,y:15},
        {x:11,y:18},
        {x:11,y:22},
        {x:11,y:25},
        {x:11,y:27},
        {x:13,y:5},
        {x:17,y:8},
        {x:18,y:8},
        {x:18,y:7},
        {x:18,y:6},
        {x:18,y:5},
        {x:17,y:5},
        {x:2,y:2},
        {x:1,y:2},
        {x:0,y:2},
        {x:0,y:4},
        {x:1,y:4},
        {x:1,y:5},
        {x:1,y:6},
        {x:1,y:7},
        {x:1,y:8},
        {x:1,y:9},
    ],
    level_string: '0,42,28,111111111111111111111111111100000000000100000011000000000010000000000010000100000000001000110000011110000000000011000111110001111110000000001111111111000011111100000000111111111110000111110000000011111111111000000000000000001111111111100000000000000000111110000000000010000000000011111111001100001000000000001111111100110000000000000000111111110011000000000000000011111111000100000000000000001111000110010000011100000000111100001100000111110000000011110000010000011110000000000101110001100011110000000000010011110010001111110000000001000000001000111111000010000110000001000000000000001100001000000000011000000000000000011001000001110000000000000000000000000111111100000000000000000000011111110000000000000100000001111111000000000000111000000111111110000000110011100000001111110000000010000110000000001100000000000000011100000000000000000000000110001000000000000000000000100000000000000000000000000010000100000000000000000000010000010010000100000000000001000010001000110000000000001100111000100011001100000000111111100110001101110000000011111100010000111110000000001111000010000011110000000000111111100000001111000000000011111110000000111111000000001111111111111111111111111111',
}
const hitboxes = {
    downFlow: [],
    upFlow: [],
    rightFlow: [],
    leftFlow: [],
}
const tile_map = [],
    tile_map_transform = {
        1: [3,0],
        2: [0,1],
        3: [1,1],
        4: [0,3],
        5: [3,1],
        6: [2,0],
        7: [3,2],
        8: [1,0],
        9: [0,2],
        10: [1,3],
        11: [2,1],
        12: [3,3],
        13: [2,3],
        14: [1,2],
        15: [2,2],
    };

const debuging = {
    showScreenSplit: true,
    showInputControl: false,
    showAimOffset: false,
    show_cell_value: false,
}

function createMapHitboxes(){//also creates tile_map


    build_level_from_string(map.level_string);
    /*for(let c=0; c<map.width; c++){
        map.cells.push([]);
    }
    map.blocks.forEach(b => {
        map.cells[b.x][b.y] = 1;
    });*/
    create_tile_map_by_cells();

}
createMapHitboxes();
function create_tile_map_by_boxes(){
    //transform map boxes object into array
    let map_boxes = [];
    for(let w=0; w<=map.width; w++){
        map_boxes[w] = [];
    }
    map.blocks.forEach(b => {
        map_boxes[b.x][b.y] = true;
    });
    for(let w=0; w<=map.width; w++){
        tile_map[w] = [];
        for(let h=0; h<=map.height; h++){
            let varient = (map_boxes[w-1]?.[h] ? 1 : 0) + 
                (map_boxes[w]?.[h] ? 2 : 0) + 
                (map_boxes[w-1]?.[h-1] ? 4 : 0) + 
                (map_boxes[w]?.[h-1] ? 8 : 0);
            if(varient) tile_map[w][h] = varient;
        }
    }
    
}
//create_tile_map_by_boxes();

function create_tile_map_by_cells(){
    for(let w=0; w<=map.width; w++){
        tile_map[w] = [];
        for(let h=0; h<=map.height; h++){
            let varient = (map.cells[w-1]?.[h] ? 1 : 0) + 
                (map.cells[w]?.[h] ? 2 : 0) + 
                (map.cells[w-1]?.[h-1] ? 4 : 0) + 
                (map.cells[w]?.[h-1] ? 8 : 0);
            if(varient) tile_map[w][h] = varient;
        }
    }
}


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
    game_speed_modification : 1,
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
    UNIT_WIDTH = setUnitSize ?? Math.round(wW/wH < 16/9 ? wH/18 : wW / 32);
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
    frameDelta = (timestamp - lastTimestamp)/1000 * AGM.game_speed_modification;  //frameDelta in seconds
    frameDelta = frameDelta > 500 ? 500 : frameDelta;  //prevent big delta when switching tabs - will be improved later
    drawBackground();
    updateCharacters();
    update_projectiles();
    drawEverything();
    check_data();//checks whether something is odd/missing etc
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
        player.data.velocity.y += 25 * player.data.movementControl;//arbitrary number for now, will be changed later on
        player.data.isGrounded = false;
        player.data.isJumping = true;
        player.data.coyoteTimer = 5;
    } else {
        if(player.data.isJumping) {
        player.data.isJumping = player.data.velocity.y < 0 ? false : player.input.jump;
        }
        player.data.isStomping = !!(player.data.isStomping || (!player.input.jump && player.input.stomp));
    }
    player.data.velocity.x += ((player.input.mright-player.input.mleft) * 5 - player.data.velocity.x) * player.data.movementControl;//3: arbitrary as well

    //calculate normalized aim vector
    let cPos = camera.position,
        pPos = player.data.position,
        pDelta = [cPos.x - pPos.x, cPos.y - pPos.y],
        w = UNIT_WIDTH,
        rAPos = player.data.realAimPosition,
        aimVector = [rAPos[0] + pDelta[0]*w, rAPos[1] + pDelta[1]*w],
        length = (aimVector[0]**2 + aimVector[1]**2)**.5;
    player.data.normalAimVector = [aimVector[0] / length, aimVector[1] / length];
}

//update player positions
function updatePlayers(){
    characters.players.forEach(p => {
        p.velocity.y -= p.isGrounded ? 0 : p.isJumping ? 25*frameDelta : p.isStomping ? (35+p.velocity.y)*p.movementControl : (p.velocity.y-40*frameDelta) < -30 ? 30+p.velocity.y : 40*frameDelta;
        p.isGrounded = false;
        /*if(p.velocity){
            let m = p.velocity > 0 ? 0 : 1;
            let x = Math.ceil(p.position.x + p.velocity.x * frameDelta - m),
                y = Math.ceil(p.position.y),// + p.velocity.y * frameDelta),
                double = y != p.position.y;
            console.log(`Checking: ${x}, ${y}`);
            if(map.cells[x]?.[y] || (double && map.cells[x]?.[y-1])) {
                console.log('STOP - XXX');
                p.position.x = x-1+2*m;
                p.velocity.x = 0;
            }
        }*/
        if(p.velocity.x > 0) {
            /*
            let m = p.velocity > 0 ? 0 : 1;
            */
            let x = Math.ceil(p.position.x + p.velocity.x * frameDelta),
                y = Math.ceil(p.position.y),// + p.velocity.y * frameDelta),
                double = y != p.position.y;
            if(map.cells[x]?.[y] || (double && map.cells[x]?.[y-1])) {
                p.position.x = x-1;
                p.velocity.x = 0;
            }
        } else if (p.velocity.x < 0) {
            let x = Math.ceil(p.position.x + p.velocity.x * frameDelta - 1),
                y = Math.ceil(p.position.y),// + p.velocity.y * frameDelta),
                double = y != p.position.y;
            if(map.cells[x]?.[y] || (double && map.cells[x]?.[y-1])) {
                p.position.x = x+1;
                p.velocity.x = 0;
            }
        }
        p.position.x += p.velocity.x*frameDelta;
        if(p.velocity.y > 0) {
            let x = Math.ceil(p.position.x),
                y = Math.ceil(p.position.y + p.velocity.y * frameDelta),// + p.velocity.y * frameDelta),
                double = x != p.position.x;
            if(map.cells[x]?.[y] || (double && map.cells[x-1]?.[y])) {
                p.position.y = y-1;
                p.velocity.y = 0;
            }
        } else if (p.velocity.y < 0) {
            let x = Math.ceil(p.position.x),
                y = Math.ceil(p.position.y + p.velocity.y * frameDelta - 1),// + p.velocity.y * frameDelta),
                double = x != p.position.x;
            if(map.cells[x]?.[y] || (double && map.cells[x-1]?.[y])) {
                p.position.y = y+1;
                p.velocity.y = 0;
                p.isGrounded = true;
                p.isStomping = false;
            }
        }
        p.position.y += p.velocity.y*frameDelta;
        p.velocity.y -= p.isGrounded ? 0 : p.isJumping ? 25*frameDelta : 40*frameDelta;
        if(p.position.y <= 0){
            p.position.y = 0;
            p.velocity.y = 0;
            p.isGrounded = true;
            p.isStomping = false;
        }
        p.coyoteTimer = p.isGrounded ? 0 : p.coyoteTimer+frameDelta;

        //decrement weapon cooldown
        if(p.weapon.cooldown > 0) p.weapon.cooldown -= frameDelta;
    });
};

function handle_player_attack(normal_attack_vector = player.data.normalAimVector){
    switch(player.data.weapon.type){
        case 0:{
            //blowgun
            if(player.data.weapon.cooldown <= 0){
                player.data.weapon.cooldown = .7;//cooldown in s; arbitrary for now
                let s = player.data.weapon.projectile_speed,
                    p = player.data.position,
                    new_projectile = {
                    type: 0,//dart
                    from: data.id,
                    position: {
                        x: p.x + .5 + normal_attack_vector[0],
                        y: p.y + .5 + normal_attack_vector[1],
                    },
                    velocity: [normal_attack_vector[0] * s,
                        normal_attack_vector[1] * s],
                };
                send_message(`Attack${seperator_key}${p.x},${p.y}${seperator_key}${JSON.stringify(normal_attack_vector)}`);
                projectiles.push(new_projectile);
            }
            break;
        }
    }
}

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

//update projectiles
function update_projectiles(){
    let dead_projectiles = [];
    projectiles.forEach((p,c) => {
        switch(p.type){
            case 0:{
                //dart
                let old_position = p.position;
                let speedModif = 2;
                p.position.x += p.velocity[0] * frameDelta / speedModif;
                p.position.y += p.velocity[1] * frameDelta / speedModif;
                p.velocity[1] -= frameDelta * 40 / speedModif;
                //check for player/mob collision
                let alive = true;
                characters.players.forEach(player => {
                    if(p.from != player.id){
                        if(Math.abs(p.position.x-player.position.x)*2 <= 1 && Math.abs(p.position.y-player.position.y)*2 <= 1){
                            //projectile hits player (note: projectile has no size yet)
                            //don't do anything rn, server tells you when :)
                            /*
                            dead_projectiles.push(c);
                            alive = false;
                            applyDamage(player, 10, 0);
                            */
                        }
                    }
                });
                if(alive && p.position.y <= 0) dead_projectiles.push(c);
                break;
            }
        }
    });
    dead_projectiles.forEach((i,c) => {
        projectiles.splice(i-c, 1);
    });
}

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
    draw_projectiles();
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
    //draw bottom line
    ctx.strokeStyle = 'rgb(180, 180, 180)';
    let w = UNIT_WIDTH,
        y = relTC.y(0);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
    /*ctx.fillStyle = 'green';
    map.blocks.forEach(block => {
        //ctx.drawImage(img.block, relTC.x(block.x),relTC.y(block.y),UNIT_WIDTH,UNIT_WIDTH);
        ctx.fillRect(Math.round(relTC.x(block.x)),Math.round(relTC.y(block.y)),w,w);
    });*/
    tile_map.forEach((l,x) => {
        l.forEach((t, y) => {
            if(t){
                let xy = tile_map_transform[t];
                ctx.drawImage(img.tile_set, xy[0]*32, xy[1]*32, 32, 32, Math.round(relTC.x(x-.5)),Math.round(relTC.y(y-.5)),UNIT_WIDTH,UNIT_WIDTH);
            }
        });
    });
    ctx.strokeStyle = 'blue';
    ctx.strokeRect(relTC.x(0),y,map.width*w,map.height*w);
}
//draw projectiles before player so they appear behind weapons
function draw_projectiles(){
    //projectiles
    ctx.fillStyle = 'rgb(150,0,0)';
    projectiles.forEach(p => {
        let x = relTC.x(p.position.x),
            y = relTC.y(p.position.y),
            vx = p.velocity[0],
            vy = p.velocity[1],
            v = (vx**2+vy**2)**.5,
            r = Math.acos((vx / v)),
            radian = (vy < 0 ? 2*Math.PI - r : r),
            w = 14,
            h = 6;
        draw_image_rotated('dart', x, y, radian, w, h);
        //ctx.fillRect(relTC.x(p.position.x)-3,relTC.y(p.position.y)-3,6,6);
    });
}
//draw players, mobs etc.
function drawPlayers(){
    ctx.textAlign = 'center';
    characters.players.forEach((p,c) => {
        ctx.fillStyle = 'rgba(255,0,0,0.1)';
        let x = relTC.x(p.position.x), y = relTC.y(p.position.y), w = UNIT_WIDTH;
        ctx.fillRect(x,y,w,w);
        ctx.drawImage(img.player,x,y,w,w);
        if(c){
            ctx.fillStyle = 'white';
            ctx.font = `${w/3}px Verdana`;
            ctx.fillText(
            p.name,
            x + w / 2,
            y - w / 2
            );
            //healthbar
            let pH = p.health;
            ctx.strokeStyle = 'grey';
            ctx.strokeRect(x-w*.2,y-w*.3,w*1.4,w*.2);
            /*ctx.fillStyle = `rgba(${100+1.5*pH},${1.5*pH},0,${1-animationData.lastDamageTick})`;
            ctx.fillRect(canvas.width/2-150,canvas.height-140,300*animationData.lastPlayerHealth/100,20);*/
            ctx.fillStyle = `rgb(${150*(80-pH)},${3*pH},0)`;
            ctx.fillRect(x-w*.2,y-w*.3,w*pH*0.014,w*.2);
            /*if(animationData.lastPlayerHealth!=pH) animationData.lastDamageTick += frameDelta;
            if(animationData.lastDamageTick>=1) animationData.lastPlayerHealth = pH;*/
        }

        //draw weapon
        switch(p.weapon.type){
            case 0:{
                //blowgun
                let ow = w/2,
                    ox = p.normalAimVector[0]*w + ow,
                    oy = p.normalAimVector[1]*w + ow,
                    r = Math.acos(p.normalAimVector[0]),
                    radian = (p.normalAimVector[1] < 0 ? 2*Math.PI - r : r);
                draw_image_rotated('blowpipe', x+ox,y+oy, radian, 32, 10);
                //ctx.drawImage(img.blowpipe,x+ox,y+oy,32,10);
                break;
            }
        }
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
    ctx.strokeRect(canvas.width/2-151,49,302,22);
    ctx.fillStyle = `rgba(${100+1.5*pH},${1.5*pH},0,${1-animationData.lastDamageTick})`;
    ctx.fillRect(canvas.width/2-150,50,300*animationData.lastPlayerHealth/100,20);
    ctx.fillStyle = `rgb(${150*(80-pH)},${3*pH},0)`;
    ctx.fillRect(canvas.width/2-150,50,300*pH/100,20);
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
    if (debuging.showAimOffset) {
        //draw attack vector
        ctx.strokeStyle = 'red';
        let p = player.data.position,
            x = relTC.x(p.x),
            y = relTC.y(p.y),
            w = UNIT_WIDTH;
        ctx.beginPath();
        ctx.moveTo(x+w/2, y+w/2);
        let nAV = player.data.normalAimVector;
        ctx.lineTo(x+w/2+(nAV[0])*50, y+w/2+(nAV[1])*50);
        ctx.moveTo(x+w/2, y+w/2);
        let cPos = camera.position,
            pPos = player.data.position,
            pDelta = [cPos.x - pPos.x, cPos.y - pPos.y];
        ctx.lineTo(x+w/2+(pDelta[0]*w), y+w/2+(pDelta[1])*w);
        ctx.stroke();
    }
    if (debuging.show_cell_value) {
        let w = UNIT_WIDTH;
        ctx.fillStyle = 'white';
        ctx.font = `${w/3}px Verdana`;
        for(let x = 0; x < map.width; x++){
            for(let y = 0; y < map.height; y++){
                let value = map.cells[x][y] ?? 0;
                ctx.fillText(
                value,
                relTC.x(x) + w/2,
                relTC.y(y) + w/2
                );
            }
        }
    }
}

function draw_image_rotated(imageId, x, y, radian, w, h) {
    //draws image centered at x/y at radian angle
    ctx.translate(x, y);
    ctx.rotate(radian);
    ctx.translate(-w / 2, -h / 2);
    ctx.drawImage(img[imageId], 0, 0, w, h);
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-radian);
    ctx.translate(-x, -y);
}

function check_data(){
    frame_count++;
    if(!(frame_count%50)){
        //do every 50th frame
        characters.players.forEach((p, c) => {
            if(c){
                if((p.id + '').length < 10){
                    //id seems odd - request new id
                    send_message('Odd_id', '???');
                }
            }
        })
    }
}

//--Game Loop End--

function pushChatMessage(author, message){
    chat_history.innerHTML = `<div class="message"><span class="bold"><span class="author">${author}</span>: </span>${message}</div>` + chat_history.innerHTML;
}

function createCharacter(type, values){
    //returning optional index on where the new character has been pushed to the corresponding array
    let idx = 0;
    switch(type){
        case 'player':{
            let player = {
                position: values?.position ?? {x:1,y:1},
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
                weapon: {
                    type: values?.type ?? 0,
                    cooldown: 0,
                    projectile_speed: 30,
                },
                realAimPosition: [0,0],
                normalAimVector: [1,0],
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
    document.querySelector('#side-menu').style.display = 'inline';
    document.querySelector('#side-menu .level-editor-menu').classList.add('hidden');
    document.querySelector('#side-menu .ingame-menu').classList.remove('hidden');
    document.querySelectorAll('#side-menu .ingame-menu .editor-bound').forEach(e => {e.classList.add('hidden');});
    document.querySelector('#debug-menu').style.display = 'inline';
    if(player.data.id === undefined){
        let name = document.querySelector('#input-nickname').value;
        let idx = createCharacter('player',{name:name,id:data.id});
        player.data = characters.players[idx];
    }
    resizeGameDisplay();
    innitialise_game_events();
    gameIsRunning=true;
    gameLoop();
    focus_canvas();
}


// -- UI functions --

function setup(){
    //called once on page load

    has_local_storage = typeof Storage !== undefined;
    if(has_local_storage) {
        is_dev = !!localStorage.getItem('is_dev');
    }
    if(is_dev){
        document.querySelector('#debug-menu').classList.remove('hidden');
        document.querySelector('#show-debug-menu').classList.remove('hidden');
    } else {
        debuging.showScreenSplit = false;
    }

    //establish peer connection
    open_peer();
}

function fadeMenu(fade, step){
    if(fade){
        document.querySelector('#debug-menu').style.transform = 'scale(0)';
        document.querySelector('#show-debug-menu').style.opacity = 1;
    } else {
        document.querySelector('#debug-menu').style.transform = 'scale(1)';
        document.querySelector('#show-debug-menu').style.opacity = 0;
    }
    focus_canvas();
}

function toggle_side_menu(){
    let menu = document.querySelector('#side-menu'),
        toggle = menu.querySelector('.close');
    if(menu.classList.contains('closed')){
        menu.classList.remove('closed');
        toggle.classList.remove('closed');
    } else {
        menu.classList.add('closed');
        toggle.classList.add('closed');
    }
    focus_canvas();
}

function focus_canvas(){
    document.querySelector('#game-canvas-event-listener').focus();
}


// -- Level Editor --

let level_editor_is_running = false,
    editor_running_timer = 0,
    editor_selected_position = [0,0],
    editor_selected_grids = [[0,0]],
    editor_brush_shape = 0,
    editor_brush_type = 0,
    editor_brush_size = 1,
    grid_dash_length = 1,
    grid_dash_pattern = 1,
    editor_level_version = 0;

function level_editor_update_loop(){
    if(level_editor_is_running){
        window.requestAnimationFrame(level_editor_update_loop);
    }

    let timestamp = new Date().getTime();
    frameDelta = (timestamp - lastTimestamp)/1000;  //frameDelta in seconds
    frameDelta = frameDelta > 500 ? 500 : frameDelta;  //prevent big delta when switching tabs - will be improved late

    editor_running_timer += frameDelta;

    update_editor_camera_position();
    draw_level_preview();

    lastTimestamp = timestamp;
}

function update_editor_camera_position(){
    let dx = player.input.mright - player.input.mleft, dy = player.input.jump - player.input.stomp;
    if(dx && dy) dx *= .71, dy *= .71;
    camera.position.x += dx * frameDelta * 20;
    camera.position.y += dy * frameDelta * 20;

    //also update selected grid relative to new camre position
    let w = UNIT_WIDTH,
        cw = canvas.width,
        ch = canvas.height,
        ax = player.data.realAimPosition[0],
        ay = player.data.realAimPosition[1],
        rx = camera.position.x + (ax - cw / 2) / w,
        ry = camera.position.y + (ay - ch / 2) / w;
    rx = rx < 0 ? 0 : rx >= (map.width-1) ? map.width-1 : rx;
    ry = ry < 0 ? 0 : ry >= (map.height-1) ? map.height-1 : ry;
    if([rx, ry] != editor_selected_position){
        editor_selected_position = [rx, ry];
        editor_update_selected_grids();
    }
}

function draw_level_preview(){
    //re-using "normal" drawing functions
    drawBackground();
    drawMap();
    draw_grid();
    drawDebug();
}

function draw_grid(){
    //draw bottom line
    let w = UNIT_WIDTH,
        dash_length = 4 * grid_dash_length,
        w8 = w/dash_length,
        dash_pattern = grid_dash_pattern ? [w8,w8*(dash_length-2),w8] : [w8,w8*(dash_length-2),w8,0],
        sx = relTC.x(0),
        sy = relTC.y(0),
        ex = relTC.x(map.width),
        ey = relTC.y(map.height);
    ctx.strokeStyle = 'rgba(180, 180, 180, .5)';
    ctx.setLineDash(dash_pattern);
    ctx.beginPath();
    for(let xm = 1; xm < map.width; xm++){
        ctx.moveTo(sx+xm*w, sy);
        ctx.lineTo(sx+xm*w, ey);
    }
    for(let ym = 1; ym < map.height; ym++){
        ctx.moveTo(sx, sy+ym*w);
        ctx.lineTo(ex, sy+ym*w);
    }
    ctx.stroke();
    ctx.setLineDash([1,0]);

    let opacity = Math.sin(editor_running_timer * 3) + 1;
    ctx.fillStyle = `rgba(250, 0, 0, ${0.2 + opacity * 0.1})`;
    editor_selected_grids.forEach(grid => {
        ctx.fillRect(relTC.x(grid[0]), relTC.y(grid[1]), w, w);
    });
}

function editor_modify_cells(){
    let max = [0,0], min = [Infinity, Infinity],
        w = map.width, h = map.height;
    switch(editor_brush_type){
        case 0:{
            //fill
            editor_selected_grids.forEach(grid => {
                if(grid[0] >= 0 && grid[0] < w && grid[1] >= 0 && grid[1] < h){
                    map.cells[grid[0]][grid[1]] = 1;
                    max[0] = Math.max(max[0], grid[0]);
                    max[1] = Math.max(max[1], grid[1]);
                    min[0] = Math.min(min[0], grid[0]);
                    min[1] = Math.min(min[1], grid[1]);
                }
            });
            break;
        }
        case 1:{
            //invert
            editor_selected_grids.forEach(grid => {
                if(grid[0] >= 0 && grid[0] < w && grid[1] >= 0 && grid[1] < h){
                    map.cells[grid[0]][grid[1]] = Number(!map.cells[grid[0]][grid[1]]);
                    max[0] = Math.max(max[0], grid[0]);
                    max[1] = Math.max(max[1], grid[1]);
                    min[0] = Math.min(min[0], grid[0]);
                    min[1] = Math.min(min[1], grid[1]);
                }
            });

            break;
        }
        case 2:{
            //remove
            editor_selected_grids.forEach(grid => {
                if(grid[0] >= 0 && grid[0] < w && grid[1] >= 0 && grid[1] < h){
                    map.cells[grid[0]][grid[1]] = 0;
                    max[0] = Math.max(max[0], grid[0]);
                    max[1] = Math.max(max[1], grid[1]);
                    min[0] = Math.min(min[0], grid[0]);
                    min[1] = Math.min(min[1], grid[1]);
                }
            });

            break;
        }
    }
    //console.log(`Lower Bound: ${min[0]}, ${min[1]} - Upper Bound: ${max[0]}, ${max[1]}`)
    update_tile_map_area(min, max);
}

function update_tile_map_area(lower_bound, upper_bound) {
    for(let xm = lower_bound[0]; xm<=upper_bound[0]+1; xm++){
        for(let ym = lower_bound[1]; ym<=upper_bound[1]+1; ym++){
            let value = 0,
                factor = 1;
            for(let yt = 0; yt > -2; yt--){
                for(let xt = -1; xt < 1; xt++){
                    value += map.cells[xm+xt]?.[ym+yt] ? factor : 0;
                    factor *= 2;
                }
            }
            tile_map[xm][ym] = value;
            
        }
    }
}

function update_tile_map_tile(x,y) {
    for(let xc = 0; xc < 2; xc++){
        for(let yc = 0; yc < 2; yc++){
            let value = 0,
                factor = 1;
            for(let yt = 0; yt > -2; yt--){
                for(let xt = -1; xt < 1; xt++){
                    value += map.cells[x+xc+xt]?.[y+yc+yt] ? factor : 0;
                    factor *= 2;
                }
            }
            tile_map[x+xc][y+yc] = value;
        }
    }
}

function editor_change_grid(grid_value){
    grid_dash_pattern = !!(grid_value%2);
    grid_dash_length = grid_value**.5;
    focus_canvas();
}

function editor_update_level_size(target_side, new_size_text){
    let new_size = Number(new_size_text);
    switch(target_side){
        case 0:{
            //width
            map.width = new_size;
            break;
        }
        case 1:{
            //height
            map.height = new_size;
            break;
        }
    }
    focus_canvas();
}

function editor_update_brush(update_type, new_value){
    switch(update_type){
        case 0:{
            //brush size
            document.querySelector('#editor-menu-brush-size').innerHTML = new_value == Math.round(new_value) ? `${new_value}.0` : new_value;
            editor_brush_size = new_value;
            break;
        }
        case 1:{
            //brush shape
            editor_brush_shape = new_value;
            break;
        }
        case 2:{
            //brush type
            editor_brush_type = new_value;
            break;
        }
    }
    focus_canvas();
}

function editor_update_selected_grids(){
    switch(editor_brush_shape){
        case 0:{
            //square
            let useable_brush_size = Math.round(editor_brush_size);
            editor_selected_grids = [];
            for(let xm = -useable_brush_size / 2; xm < (useable_brush_size/2); xm++){
                for(let ym = -useable_brush_size / 2; ym < useable_brush_size/2; ym++){
                    editor_selected_grids.push([Math.ceil(editor_selected_position[0]+xm),Math.ceil(editor_selected_position[1]+ym)]);
                }
            }
            break;
        }
        case 1:{
            //circle
            let useable_brush_size = editor_brush_size;
            editor_selected_grids = [];
            for(let xm = -useable_brush_size / 2; xm < (useable_brush_size/2); xm++){
                for(let ym = -useable_brush_size / 2; ym < useable_brush_size/2; ym++){
                    let target_cell = [Math.ceil(editor_selected_position[0]+xm),Math.ceil(editor_selected_position[1]+ym)],
                        distance = ((editor_selected_position[0]-target_cell[0])**2+(editor_selected_position[1]-target_cell[1])**2)**.5;
                    if(distance < editor_brush_size/2){
                        editor_selected_grids.push(target_cell);
                    }
                }
            }
            break;
        }
    }
}

function create_level_file(){
    //returns string containing all level data
    let cell_data = '',
        w = map.width,
        h = map.height;
    for(let x=0; x<w; x++){
        let row_data = '';
        for(let y=0; y<h; y++){
            if(isNaN(map.cells[x][y] ?? 0)) {
                console.log('Error: wrong cell value type');
                console.log(map.cells[x][y]);
            }
            row_data += map.cells[x][y] ?? 0;
        }
        cell_data += row_data;
    }
    return `${editor_level_version},${map.width},${map.height},${cell_data}`;
}

function editor_save_level(){
    //save level locally
    if(has_local_storage){
        localStorage.setItem('editor_saved_level', create_level_file());
    } else {
        alert(`Your browser does not support local storage.\nIf you wish to save your level data, download it instead.`);
    }
    focus_canvas();
}

function build_level_from_string(level_string){
    let level_data = level_string.split(',');
        level_version = level_data[0];
    switch(level_version){
        case '0':{
            let w = Number(level_data[1]),
                h = Number(level_data[2]),
                cell_data = level_data[3];
            map.width = w;
            map.height = h;
            map.cells = [];
            for(let x=0; x<w; x++){
                let row = [];
                for(let y=0; y<h; y++){
                    row.push(Number(cell_data[(x)*h+y]));
                }
                map.cells.push(row);
            }
            create_tile_map_by_cells();
            document.querySelector('#level-editor-input-level-width').value = w;
            document.querySelector('#level-editor-input-level-height').value = h;
            break;
        }
        default:{
            console.log(`Tried to load unknown Level Version: ${level_version}`);
        }
    }

}

function editor_load_level(){
    //load locally saved level
    if(has_local_storage){
        let saved_level_data = localStorage.getItem('editor_saved_level');
        build_level_from_string(saved_level_data);
    } else {
        alert(`Cannot load level: Your browser does not support local storage.`);
    }
    focus_canvas();
}

function editor_export_level(){
    //export level data as .txt file
    let filename = `${new Date().getTime()}-custom-platformer-level`,
        text_content = create_level_file(),
        element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(text_content)
    );
    element.setAttribute("download", filename);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    focus_canvas();
}

function editor_import_level(input){
    //import level data from .txt file
    let file = input.files[0],
        reader = new FileReader();

    reader.readAsText(file);

    reader.onload = function () {
        console.log(reader.result);
        build_level_from_string(reader.result);
    };

    reader.onerror = function () {
        console.log(reader.error);
        alert("Error: failed loading level file");
        return;
    };
    
    focus_canvas();
}

function editor_test_level(){
    console.log('Testing level setup...');
    document.querySelector('#chat').classList.remove('hidden');
    document.querySelector('#side-menu .level-editor-menu').classList.add('hidden');
    document.querySelector('#side-menu .ingame-menu').classList.remove('hidden');
    document.querySelectorAll('#side-menu .ingame-menu .editor-bound').forEach(e => {e.classList.remove('hidden');});
    document.querySelector('#menu-return-to-editor').classList.remove('hidden');
    if(player.data.id === undefined){
        let name = document.querySelector('#input-nickname').value;
        let idx = createCharacter('player',{name:name,id:data.id});
        player.data = characters.players[idx];
    }
    innitialise_editor_events(false);
    innitialise_game_events();
    level_editor_is_running = false;
    gameIsRunning=true;
    gameLoop();
    focus_canvas();
}

function enter_editor_mode(){
    console.log('Returning to editor...');
    document.querySelector('#chat').classList.add('hidden');
    document.querySelector('#side-menu .level-editor-menu').classList.remove('hidden');
    document.querySelector('#side-menu .ingame-menu').classList.add('hidden');
    document.querySelectorAll('#side-menu .ingame-menu .editor-bound').forEach(e => {e.classList.remove('hidden');});
    innitialise_editor_events();
    innitialise_game_events(false);
    level_editor_is_running = true;
    gameIsRunning = false;
    level_editor_update_loop();
    focus_canvas();
}

function start_level_editor(){
    console.log('Starting Level Editor');
    document.querySelector('#start-menu').style.display = 'none';
    document.querySelector('#chat').classList.add('hidden');
    document.querySelector('#side-menu').style.display = 'inline';
    document.querySelector('#debug-menu').style.display = 'inline';
    document.querySelector('#level-editor-input-level-width').value = map.width;
    document.querySelector('#level-editor-input-level-height').value = map.height;
    resizeGameDisplay();
    level_editor_is_running=true;
    innitialise_editor_events();
    level_editor_update_loop();
    focus_canvas();
}

function exit_level_editor(){
    console.log('Exiting Level Editor');
    document.querySelector('#chat').classList.remove('hidden');
    document.querySelector('#start-menu').style.display = 'inline';
    document.querySelector('#side-menu').style.display = 'none';
    document.querySelector('#menu-return-to-editor').classList.add('hidden');
    level_editor_is_running=false;
    innitialise_editor_events(false);
}


setup();