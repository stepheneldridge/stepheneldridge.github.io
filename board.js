let canvas;
let context;
let board;
function init(){
    canvas = document.createElement("canvas");
    context = canvas.getContext("2d");
    document.body.appendChild(canvas);
    canvas.width = 1000;
    canvas.height = 1000;
    board = new Board(1000,1000);
    board.draw(context);
    var events = ["onmousedown", "onmouseup", "onmousemove"];
    //  "ontouchstart", "ontouchend", "ontouchmove" later
    for(i of events){
        canvas[i] = mouse_handler;
    }
    board.set_tile(0, 0, new Piece(Piece.ROOK, "black"));
    board.set_tile(1, 0, new Piece(Piece.KNIGHT, "black"));
    board.set_tile(2, 0, new Piece(Piece.BISHOP, "black"));
    board.set_tile(3, 0, new Piece(Piece.QUEEN, "black"));
    board.set_tile(4, 0, new Piece(Piece.KING, "black"));
    board.set_tile(5, 0, new Piece(Piece.BISHOP, "black"));
    board.set_tile(6, 0, new Piece(Piece.KNIGHT, "black"));
    board.set_tile(7, 0, new Piece(Piece.ROOK, "black"));
    for(let i = 0; i < 8; i++){
        board.set_tile(i, 1, new Piece(Piece.PAWN, "black"));
        board.set_tile(i, 6, new Piece(Piece.PAWN, "white"));
    }


    board.set_tile(0, 7, new Piece(Piece.ROOK, "white"));
    board.set_tile(1, 7, new Piece(Piece.KNIGHT, "white"));
    board.set_tile(2, 7, new Piece(Piece.BISHOP, "white"));
    board.set_tile(3, 7, new Piece(Piece.QUEEN, "white"));
    board.set_tile(4, 7, new Piece(Piece.KING, "white"));
    board.set_tile(5, 7, new Piece(Piece.BISHOP, "white"));
    board.set_tile(6, 7, new Piece(Piece.KNIGHT, "white"));
    board.set_tile(7, 7, new Piece(Piece.ROOK, "white"));
    board.draw_repeats.previous.push(board.hash_position()); //add after game start
    board.draw(context);
}

function mouse_handler(event){
    board.mouse_events(event)
    board.draw(context);
}

class PromotionWindow{
    constructor(x, y, p, b){
        this.x = x;
        this.y = y;
        this.piece = p;
        this.board = b;
        this.promotions = this.piece.get_promotions();
        this.window_x = (this.board.tiles_x - this.promotions.length) / 2;
        this.window_y = this.board.tiles_y / 2 - 0.5;
        this.active = null;
    }

    mouse_events(event){
        let type = event.type;
        let btn = event.button;
        this.mouse_x = event.offsetX;
        this.mouse_y = event.offsetY;
        if(btn != 0)return;
        let tile_index = Math.floor(this.mouse_x / this.board.size_x - this.window_x);
        let y_frame = this.mouse_y / this.board.size_y - this.window_y;
        this.active = null;
        if(tile_index < 0 || tile_index >= this.promotions.length || y_frame < 0 || y_frame >= 1)return;
        this.active = tile_index;
        if(type == "mousedown"){
            this.board.do_promotion(this.x, this.y, this.promotions[this.active]);
        }
    }

    draw(ctx){
        ctx.fillStyle = "black";
        ctx.globalAlpha = 0.4;
        ctx.fillRect(0, 0, this.board.width, this.board.height);
        ctx.globalAlpha = 1;
        let color = this.piece.color;
        let border = 20;
        ctx.fillStyle = "lightgrey";
        ctx.fillRect(this.window_x * this.board.size_x - border, this.window_y * this.board.size_y - border, this.board.size_x * this.promotions.length + 2 * border, this.board.size_y + 2 * border);
        if(this.active != null){
            ctx.fillStyle = "green";
            ctx.globalAlpha = 0.2;
            ctx.fillRect((this.window_x + this.active) * this.board.size_x, this.window_y * this.board.size_y, this.board.size_x, this.board.size_y);
            ctx.globalAlpha = 1;
        }
        for(let i = 0; i < this.promotions.length; i++){
            Piece.draw_piece(ctx, this.window_x + i, this.window_y, this.board.size_x, this.board.size_y, color, this.promotions[i].icon[color]);
        }
    }
}

class EndWindow{
    constructor(result, board){
        this.result = result;
        this.board = board;
        if(this.result == "draw"){
            this.message = "Draw";
        }else{
            this.message = this.result.charAt(0).toUpperCase() + this.result.slice(1) + " Wins";
        }
    }

    mouse_events(event){

    }

    draw(ctx){
        ctx.fillStyle = "black";
        ctx.globalAlpha = 0.4;
        ctx.fillRect(0, 0, this.board.width, this.board.height);
        ctx.globalAlpha = 1;
        if(this.result == "draw"){
            ctx.fillStyle = "grey";
        }else{
            ctx.fillStyle = this.result;
        }
        let size = this.board.height / 10;
        ctx.font = size + "px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.message, this.board.width / 2, this.board.height / 2);
    }
}

class Board{
    constructor(w, h){
        this.width = w;
        this.height = h;
        this.set_grid(8, 8); // hard coded for now
        this.checkered = true; //
        this.check_colors = ["#f0d9b5", "#b58863"]; //
        this.selected_piece = null;
        this.pockets = {
            "white": [],
            "black": []
        }
        this.checks = {
            "white": false,
            "black": false
        }
        this.mouse_x = 0;
        this.mouse_y = 0;
        this.piece_types = [Piece.PAWN, Piece.ROOK, Piece.KNIGHT, Piece. BISHOP, Piece.QUEEN, Piece.KING]; //
        this.piece_index = [];
        for(let i = 0; i < this.piece_types.length; i++){
            this.piece_index.push(this.piece_types[i].id);
        }
        this.ply = 1;
        this.turn = "white";
        this.promotion_window = false;
        this.set_draw_time(100, [Piece.PAWN.id]); // 100 ply = 50 moves
        this.set_draw_repeats(3); // 3 fold repetition
        this.move_history = [];
    }

    set_draw_time(time, reset_pieces){
        if(time <= 0){
            delete this.draw_timer;
            return;
        }
        this.draw_timer = {
            "time": time,
            "reset_pieces": reset_pieces,
            "last_reset": 0
        };
    }

    set_draw_repeats(r){
        if(r <= 0){
            delete this.draw_repeats;
            return;
        }
        this.draw_repeats = {
            "repeats": r,
            "previous": []
        }
    }
    //tags jump noncapture captureonly first blocked repeat king selfcapture
    get_valid_moves(x, y, movements, ignore, walls, override){
        let valid = []
        let self;
        if(override){
            self = override;
        }else{
            self = this.get_tile(x, y);
        }
        if(!ignore)ignore = [[]];
        if(!walls)walls = [[]];
        let dir = self.color == "white" ? -1 : 1;
        for(let i of movements){
            let tags = i.tags;
            let moves = i.moves;
            if(tags.includes("blocked")){
                let blocker = [x + i.by[0], y + i.by[1] * dir];
                if(this.has_array(ignore, blocker)){

                }else if(this.get_tile(...blocker) != null){
                    continue;
                }
            }
            if(tags.includes("first") && self.has_moved)continue;
            if(tags.includes("jump")){
                for(let c of moves){
                    let coord = [x + c[0], y + c[1] * dir]
                    if(this.is_inside(...coord)){
                        let t = this.get_tile(...coord);
                        if(this.has_array(ignore, coord)){
                            t = null;
                        }
                        if(t == null){
                            if(tags.includes("captureonly"))continue;
                            valid.push(coord);
                        }else{
                            if(this.has_array(walls, coord))continue;
                            if(tags.includes("noncapture"))continue;
                            if((tags.includes("selfcapture") && t.color == self.color) || self.color != t.color){
                                valid.push([...coord, {"selfcapture": tags.includes("selfcapture")}]);
                            }
                        }
                    }
                }
            }else if(tags.includes("repeat")){
                for(let v of moves){
                    let coord = [x + v[0], y + v[1] * dir];
                    while(this.is_inside(...coord)){
                        if(this.has_array(walls, coord))break;
                        let t = this.get_tile(...coord);
                        if(this.has_array(ignore, coord)){
                            t = null;
                        }
                        if(t == null){
                            if(tags.includes("captureonly"))continue;
                        }else{
                            if(tags.includes("noncapture"))break;
                            if((tags.includes("selfcapture") && t.color == self.color) || self.color != t.color){
                                valid.push([...coord, {"selfcapture": tags.includes("selfcapture")}]);
                            }
                            break;
                        }
                        valid.push(coord);
                        coord = [coord[0] + v[0], coord[1] + v[1] * dir];
                    }
                }
            }else if(tags.includes("castle")){
                if(self.has_moved)continue;
                if(this.checks[self.color])continue;
                for(let v of moves){
                    let coord = [x + v[0], y + v[1] * dir];
                    while(this.is_inside(...coord)){
                        let t = this.get_tile(...coord);
                        if(this.has_array(ignore, coord)){
                            t = null;
                        }
                        if(t != null){
                            if(t.get_tags().includes("castle") && !t.has_moved){
                                let through_check = false;
                                if(!override){
                                    for(let s = 0; s < i.distance; s++){
                                        let temp = [x + v[0] * s, y + v[1] * dir * s]
                                        if(this.is_attacked(...temp, [[x, y]], [[]], self)){
                                            through_check = true
                                            break;
                                        }
                                    }
                                }
                                if(through_check)break;
                                let dest = [x + v[0] * i.distance, y + v[1] * dir * i.distance]
                                valid.push([dest[0], dest[1], {"castle":{"orig": coord, "dest": [dest[0] - v[0], dest[1] - v[1] * dir]}}]);
                            }
                            break;
                        }
                        coord = [coord[0] + v[0], coord[1] + v[1] * dir];
                    }
                }
            }
        }
        if(self.get_tags().includes("king") && !override){
            let unchecked = []
            for(let i of valid){
                if(!this.is_attacked(i[0], i[1], [[x, y]], [[]], self)){
                    unchecked.push(i);
                }
            }
            valid = unchecked;
        }else if(!override){
            let unchecked = [];
            let k = this.find_king(self.color);
            if(k){
                for(let i of valid){
                    if(!this.is_attacked(k[0], k[1], [[x, y]], [i], k[2])){
                        unchecked.push(i);
                    }
                }
                valid = unchecked;
            }
        }
        return valid;
    }

    //issue with pieces that can attack with a blockable jump, chinese knight
    is_attacked(x, y, ignore, walls, override){
        let moves = []
        let self = this.get_tile(x, y);
        if(override){
            self = override;
        }
        if(!ignore){
            ignore = [[]];
        }
        if(!walls){
            walls = [[]];
        }
        for(let i of this.piece_types){
            let c = this.get_valid_moves(x, y, i.moves, ignore, walls, self);
            for(let j of c){
                let t = this.get_tile(...j);
                if(t != null && t.id == i.id && t.color != self.color){
                    moves.push(j);
                }
            }
        }
        return moves.length > 0;
    }

    has_moves(color){
        for(let i = 0; i < this.tiles.length; i++){
            for(let j = 0; j < this.tiles[i].length; j++){
                let t = this.tiles[i][j];
                if(t == null)continue;
                if(t.color == color){
                    if(this.get_valid_moves(i, j, t.get_moves()).length > 0){
                        return true;
                    }
                }
            }
        }
        return false;
    }

    find_king(color){
        for(let x = 0; x < this.tiles.length; x++){
            for(let y = 0; y < this.tiles[x].length; y++){
                let t = this.tiles[x][y];
                if(t != null && t.get_tags().includes("king") && t.color == color)return [x, y, t];
            }
        }
        return null;
    }

    check_draws(){
        if(this.draw_timer){ // 50 move rule
            let last = this.move_history[this.move_history.length - 1];
            if(this.draw_timer.reset_pieces.includes(last.piece_id) || last.data.capture){
                this.draw_timer.last_reset = 0;
            }else{
                this.draw_timer.last_reset += 1;
            }
            if(this.draw_timer.time == this.draw_timer.last_reset){
                return true;
            }
        }
        if(this.draw_repeats){
            let new_hash = this.hash_position();
            let count = this.draw_repeats.previous.reduce(
                function(a, v){
                    return v == new_hash ? a + 1 : a
                }, 1
            )
            if(count >= this.draw_repeats.repeats){
                return true;
            }
            this.draw_repeats.previous.push(new_hash);
        }
        return false;
    }

    file_label(x){
        let r = x / 26;
        let file = "";
        for(let i = 0; i <= r; i++){
            file += String.fromCharCode(x % 26 + 97);
        }
        return file;
    }

    hash_position(){
        let hash = "";
        for(let i = 0; i < this.tiles.length; i++){
            for(let j = 0; j < this.tiles[i].length; j++){
                let p = this.tiles[i][j];
                if(p != null){
                    hash += "#" + this.piece_index.indexOf(p.id) + ":" + (i * this.tiles_y + j);
                }
            }
        }
        hash += "|" + (this.turn == "white" ? 0 : 1);
        return hash;
    }

    select(x, y){
        let tile = this.get_tile(x, y);
        if(tile != null){
            if(tile.color != this.turn)return false;
            let valid = this.get_valid_moves(x, y, tile.get_moves());
            this.selected_piece = [x, y, tile, valid];
            this.selected_piece[2].is_drag = true;
            this.update_drag();
            return true;
        }
        return false;
    }

    update_drag(){
        this.selected_piece[2].drag_x = this.mouse_x / this.size_x;
        this.selected_piece[2].drag_y = this.mouse_y / this.size_y;
    }

    get_mouse_tile(){
        return [
            Math.floor(this.mouse_x / this.size_x),
            Math.floor(this.mouse_y / this.size_y)
        ];
    }

    mouse_events(event){
        if(this.promotion_window){
            return this.promotion_window.mouse_events(event);
        }
        if(this.end_window){
            return this.end_window.mouse_events(event);
        }
        var btn = event.button;
        this.mouse_x = event.offsetX;
        this.mouse_y = event.offsetY;
        var type = event.type;
        if(btn != 0)return;
        var mc = this.get_mouse_tile();
        var tx = mc[0];
        var ty = mc[1];
        switch(type){
            case "mousedown":
                if(this.selected_piece == null){
                    return this.select(tx, ty);
                }else{
                    if(tx == this.selected_piece[0] && ty == this.selected_piece[1]){
                        this.selected_piece[2].is_drag = !this.selected_piece[2].is_drag;
                        this.update_drag();
                        return true;
                        //stop drag
                    }else if(!this.has_array(this.selected_piece[3], [tx, ty])){
                        return this.select(tx, ty);
                    }
                    //place selected piece if valid
                    //actions are on mouse up^
                }
                break
            case "mouseup":
                if(this.selected_piece == null)return;
                if(tx == this.selected_piece[0] && ty == this.selected_piece[1]){
                    this.selected_piece[2].is_drag = false;
                    return true;
                    //stop drag
                }else{
                    //place if valid
                    this.selected_piece[2].is_drag = false;
                    if(this.has_array(this.selected_piece[3], [tx, ty])){
                        this.move_tile(tx, ty, ...this.selected_piece);
                        this.turn = this.turn == "white" ? "black" : "white";
                        this.ply += 1;
                        for(let c in this.checks){
                            let k = this.find_king(c);
                            if(k != null){
                                this.checks[c] = this.is_attacked(k[0], k[1]);
                            }else{
                                this.checks[c] = false;
                            }

                        }
                        let can_move = this.has_moves(this.turn);
                        if(!can_move){ //checkmate and stalemate
                            let result = !this.checks[this.turn] ? "draw" : this.turn == "white" ? "black" : "white";
                            this.end_window = new EndWindow(result, this);
                        }
                        if(this.check_draws()){
                            this.end_window = new EndWindow("draw", this);
                        }
                    }
                    this.selected_piece = null;
                    return true;
                }
                break
            case "mousemove":
                if(this.selected_piece == null)return;
                if(this.selected_piece[2].is_drag){
                    this.update_drag();
                    return true;
                }
                break
        }
    }

    array_equal(a, b){
        if(a.length != b.length)return false;
        for(let i in a){
            if(a[i] != b[i])return false;
        }
        return true;
    }

    has_array(a, b){
        //assumes length 2 for coords
        for(let i of a){
            if(this.array_equal(i.slice(0, 2), b))return true;
        }
        return false;
    }

    get_array(a, b){
        for(let i of a){
            if(this.array_equal(i.slice(0, 2), b))return i;
        }
        return null;
    }

    is_inside(x, y){
        return  x >= 0 && x < this.tiles.length && y >= 0 && y < this.tiles[0].length
    }

    get_tile(x, y){
        if(this.is_inside(x, y)){
            return this.tiles[x][y];
        }
        return null;
    }

    //shogi can promote when leaving, not possible atm
    promote_piece(x, y, piece){
        this.promotion_window = new PromotionWindow(x, y, piece, this);
    }

    do_promotion(x, y, piece){
        this.promotion_window = null;
        let t = this.get_tile(x, y);
        if(!t)return console.error("Promotion piece could not be found");
        let new_t = new Piece(piece, t.color);
        new_t.set_was(t);
        let last_history = this.move_history[this.move_history.length - 1];
        last_history.data.promotion = new_t.id;
        this.tiles[x][y] = new_t;
    }

    move_tile(tx, ty, fx, fy, p, valid){
        let extra = true;
        let selfcap = false;
        let castles = false;
        if(valid){ //checking move list, not validity
            let move = this.get_array(valid, [tx, ty]);
            if(move.length > 2 && move[2] != null){
                let data = move[2];
                if("castle" in data){
                    let t = this.get_tile(...data.castle.orig);
                    extra = this.move_tile(...data.castle.dest, ...data.castle.orig, t);
                    castles = extra;
                }
                if("selfcapture" in data){
                    selfcap = data.selfcapture;
                }
            }
        }
        if(extra && this.set_tile(tx, ty, p, selfcap)){
            let data = {
                "from": [fx, fy],
                "to": [tx, ty],
                "piece_id": p.id,
                "data": {}
            };
            if(this.capture_flag){
                data.data.capture = true;
                delete this.capture_flag;
            }
            if(castles){
                data.data.castles = true;
            }
            this.move_history.push(data);
            if(p.should_promote(tx, ty)){
                this.promote_piece(tx, ty, p);
            }
            p.has_moved = true;
            this.tiles[fx][fy] = null;
            return true;
        }
    }

    set_tile(x, y, p, selfcap){
        let t = this.get_tile(x, y);
        if(t != null){
            if(t.color != p.color || selfcap){
                if(t.was){
                    t = t.was;
                }
                this.capture_flag = true;
                this.pockets[p.color].push(t);
                this.tiles[x][y] = p;
                return true;
            }
            //capture? or unhandled error?
        }else if(this.is_inside(x, y)){
            this.tiles[x][y] = p;
            return true;
        }else{
            //invalid
        }
    }

    set_grid(x, y){
        this.tiles_x = x;
        this.tiles_y = y;
        this.size_x = this.width / this.tiles_x;
        this.size_y = this.height / this.tiles_y;
        this.tiles = [];
        for(let i = 0; i < y; i++){
            let row = [];
            for(let j = 0; j < x; j++){
                row.push(null);
            }
            this.tiles.push(row);
        }
    }

    draw(ctx){
        let check = 0;
        for(let i = 0; i < this.tiles_x; i++){
            for(let j = 0; j < this.tiles_y; j++){
                ctx.fillStyle = this.check_colors[check];
                check = check == 0 ? 1 : 0;
                ctx.fillRect(i * this.size_x, j * this.size_y, this.size_x, this.size_y);
            }
            check = check == 0 ? 1 : 0;
        }
        for(let c in this.checks){
            if(!this.checks[c])continue;
            let k = this.find_king(c);
            ctx.fillStyle = "red";
            ctx.globalAlpha = 0.2;
            ctx.fillRect(k[0] * this.size_x, k[1] * this.size_y, this.size_x, this.size_y);
            ctx.globalAlpha = 1;
        }
        if(this.selected_piece != null){
            let mc = this.get_mouse_tile();
            for(let i of this.selected_piece[3]){
                let t = this.get_tile(...i);
                ctx.fillStyle = "green";
                ctx.strokeStyle = "green";
                if(i[0] == mc[0] && i[1] == mc[1]){
                    ctx.globalAlpha = 0.2;
                    ctx.fillRect(i[0] * this.size_x, i[1] * this.size_y, this.size_x, this.size_y);
                }else if(t != null){
                    ctx.lineWidth = "10";
                    ctx.globalAlpha = 0.5;
                    ctx.beginPath();
                    ctx.rect(i[0] * this.size_x + 5, i[1] * this.size_y + 5, this.size_x - 10, this.size_y - 10);
                    ctx.stroke();
                }else{
                    ctx.globalAlpha = 0.5;
                    ctx.beginPath();
                    ctx.arc((i[0] + 0.5) * this.size_x, (i[1] + 0.5) * this.size_y, Math.min(this.size_x, this.size_y) / 8, 0, 2 * Math.PI, false);
                    ctx.fill();
                }
            }
            ctx.fillStyle = "green";
            ctx.globalAlpha = 0.2;
            ctx.fillRect(this.selected_piece[0] * this.size_x, this.selected_piece[1] * this.size_y, this.size_x, this.size_y);
            ctx.globalAlpha = 0.5;
            this.selected_piece[2].draw(ctx, this.selected_piece[0], this.selected_piece[1], this.size_x, this.size_y);
            ctx.globalAlpha = 1;
        }
        for(let i in this.tiles){
            for(let j in this.tiles[0]){
                let t = this.tiles[i][j];
                if(t != null){
                    if(t.is_drag){
                        t.draw(ctx, t.drag_x - 0.5, t.drag_y - 0.5, this.size_x, this.size_y);
                    }else{
                        t.draw(ctx, i, j, this.size_x, this.size_y);
                    }
                }
            }
        }
        if(this.promotion_window){
            this.promotion_window.draw(ctx);
        }
        if(this.end_window){
            this.end_window.draw(ctx);
        }
    }
}

class Piece{
    static KNIGHT = {
        "id": "knight",
        "moves": [
            {"moves": [[1, 2], [2, 1], [-1, 2], [2, -1], [1, -2], [-2, 1], [-1, -2], [-2, -1]], "tags": ["jump"]}
        ],
        "icon": {
            "type": "char",
            "white": "♘",
            "black": "♞"
        }
    }

    static ROOK = {
        "id": "rook",
        "tags": ["castle"],
        "moves": [
            {"moves": [[1, 0], [-1, 0], [0, 1], [0, -1]], "tags": ["repeat"]}
        ],
        "icon": {
            "type": "char",
            "white": "♖",
            "black": "♜"
        }
    }

    static BISHOP = {
        "id": "bishop",
        "moves": [
            {"moves": [[1, 1], [-1, -1], [-1, 1], [1, -1]], "tags": ["repeat"]}
        ],
        "icon": {
            "type": "char",
            "white": "♗",
            "black": "♝"
        }
    }

    static QUEEN = {
        "id": "queen",
        "moves": [
            {"moves": [[0, 1], [0, -1], [-1, 0], [1, 0], [1, 1], [-1, -1], [-1, 1], [1, -1]], "tags": ["repeat"]}
        ],
        "icon": {
            "type": "char",
            "white": "♕",
            "black": "♛"
        }
    }

    static KING = {
        "id": "king",
        //needs handlers for checks
        "tags": ["king"],
        "moves": [
            {"moves": [[0, 1], [0, -1], [-1, 0], [1, 0], [1, 1], [-1, -1], [-1, 1], [1, -1]], "tags": ["jump", "king"]},
            {"moves": [[1, 0], [-1, 0]], "tags": ["castle", "king"], "distance": 2}
            //add castling
        ],
        "icon": {
            "type": "char",
            "white": "♔",
            "black": "♚"
        }
    }

    static PAWN = {
        "id": "pawn",
        "tags": ["promote"],
        "promotions": {
            "forced": true,
            "region": {
                "black": function(x, y){
                    return y >= 7
                },
                "white": function(x, y){
                    return y <= 0;
                }
            },
            "options": [Piece.ROOK, Piece.KNIGHT, Piece.BISHOP, Piece.QUEEN],
            "default": Piece.QUEEN
        },
        "moves":[
            {"moves": [[0, 1]], "tags": ["jump", "noncapture"]},
            {"moves": [[1, 1], [-1, 1]], "tags": ["captureonly", "jump"]}, //en passant as well?
            {"moves": [[0, 2]], "tags": ["first", "noncapture", "blocked", "jump"], "by": [0, 1]}
        ],
        "icon": {
            "type": "char",
            "white": "♙",
            "black": "♟"
        }
    }
    //tags jump noncapture captureonly first blocked repeat king
    constructor(preset, color){
        this.preset = preset;
        this.color = color;
        this.icon = preset.icon[color];
        this.is_drag = false;
        this.drag_x = 0;
        this.drag_y = 0;
        this.has_moved = false;
        this.tags = this.preset.tags ? this.preset.tags : [];
        this.id = this.preset.id;
        this.was = null;
    }

    set_was(was){
        this.was = was;
    }

    get_moves(){
        return this.preset.moves;
    }

    get_tags(){
        return this.tags;
    }

    should_promote(x, y){
        if(this.tags.includes("promote")){
            return this.preset.promotions.region[this.color](x,y);
        }
        return false;
    }

    get_promotions(){
        return this.preset.promotions.options;
    }

    draw(ctx, x, y, sx, sy){
        Piece.draw_piece(ctx, x, y, sx, sy, this.color, this.icon);
    }

    static draw_piece(ctx, x, y, sx, sy, color, icon){
        ctx.fillStyle = color;
        let size = Math.min(sx, sy); 
        ctx.font = size + "px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(icon, x * sx + sx / 2, y * sy + sy / 2);
    }
}