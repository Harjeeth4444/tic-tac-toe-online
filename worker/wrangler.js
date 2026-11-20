export class Room {
    constructor(state, env) {
        this.state = state;

        this.players = [];
        this.symbols = new Map();

        this.board = [
            "", "", "",
            "", "", "",
            "", "", ""
        ];

        this.turn = "X";
        this.gameOver = false;
    }

    async fetch(request) {

        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);

        server.accept();

        if (this.players.length >= 2) {

            server.send(JSON.stringify({
                type: "error",
                message: "Lobby full"
            }));

            server.close();

            return new Response(null, {
                status: 101,
                webSocket: client
            });
        }

        const symbol =
            this.players.length === 0
                ? "X"
                : "O";

        this.players.push(server);
        this.symbols.set(server, symbol);

        server.send(JSON.stringify({
            type: "assign",
            symbol
        }));

        this.sendState();

        server.addEventListener("message", event => {

            if (this.gameOver) return;

            const playerSymbol =
                this.symbols.get(server);

            const data =
                JSON.parse(event.data);

            const index =
                data.move;

            if (playerSymbol !== this.turn)
                return;

            if (
                index < 0 ||
                index > 8 ||
                this.board[index] !== ""
            ) {
                return;
            }

            this.board[index] =
                playerSymbol;

            if (this.checkWinner(playerSymbol)) {

                this.broadcast({
                    type: "board",
                    board: this.board,
                    message: `${playerSymbol} wins!`
                });

                this.broadcast({
                    type: "winner",
                    winner: playerSymbol
                });

                this.gameOver = true;
                return;
            }

            if (
                this.board.every(
                    cell => cell !== ""
                )
            ) {

                this.broadcast({
                    type: "board",
                    board: this.board,
                    message: "Draw!"
                });

                this.broadcast({
                    type: "draw"
                });

                this.gameOver = true;
                return;
            }

            this.turn =
                this.turn === "X"
                    ? "O"
                    : "X";

            this.sendState();
        });

        server.addEventListener("close", () => {

            this.players =
                this.players.filter(
                    p => p !== server
                );

            this.symbols.delete(server);
        });

        return new Response(null, {
            status: 101,
            webSocket: client
        });
    }

    sendState() {

        this.broadcast({
            type: "board",
            board: this.board,
            message: `${this.turn}'s turn`
        });
    }

    broadcast(data) {

        const message =
            JSON.stringify(data);

        this.players.forEach(player => {

            try {
                player.send(message);
            } catch {}
        });
    }

    checkWinner(symbol) {

        const wins = [

            [0,1,2],
            [3,4,5],
            [6,7,8],

            [0,3,6],
            [1,4,7],
            [2,5,8],

            [0,4,8],
            [2,4,6]
        ];

        return wins.some(combo => {

            return combo.every(index => {

                return (
                    this.board[index] === symbol
                );
            });
        });
    }
}

export default {

    async fetch(request, env) {

        const url =
            new URL(request.url);

        if (
            url.pathname === "/api/create"
        ) {

            const code =
                Math.random()
                    .toString(36)
                    .substring(2, 6)
                    .toUpperCase();

            return Response.json({
                code
            });
        }

        if (
            url.pathname.startsWith(
                "/api/ws/"
            )
        ) {

            const code =
                url.pathname.split("/")
                .pop()
                .toUpperCase();

            const id =
                env.ROOM.idFromName(code);

            const room =
                env.ROOM.get(id);

            return room.fetch(request);
        }

        return new Response(
            "Cloud Tic Tac Toe Online",
            {
                status: 200
            }
        );
    }
};
