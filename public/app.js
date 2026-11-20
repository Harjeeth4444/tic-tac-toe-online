let socket = null;
let playerSymbol = "";

const cells = document.querySelectorAll(".cell");

const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const roomInput = document.getElementById("roomInput");

const roomCode = document.getElementById("roomCode");
const statusText = document.getElementById("status");

createBtn.addEventListener("click", async () => {

    try {

        const response = await fetch("/api/create");

        const data = await response.json();

        connectToRoom(data.code);

    } catch {

        statusText.textContent =
            "Could not create lobby.";
    }
});

joinBtn.addEventListener("click", () => {

    const code =
        roomInput.value.trim().toUpperCase();

    if (!code) {

        statusText.textContent =
            "Enter a lobby code.";

        return;
    }

    connectToRoom(code);
});

function connectToRoom(code) {

    roomCode.textContent =
        `Lobby: ${code}`;

    statusText.textContent =
        "Connecting...";

    socket = new WebSocket(
        `wss://${window.location.host}/api/ws/${code}`
    );

    socket.onopen = () => {

        statusText.textContent =
            "Connected.";
    };

    socket.onmessage = (event) => {

        const data =
            JSON.parse(event.data);

        if (data.type === "assign") {

            playerSymbol =
                data.symbol;

            statusText.textContent =
                `You are ${playerSymbol}`;
        }

        if (data.type === "board") {

            updateBoard(data.board);

            if (data.message) {

                statusText.textContent =
                    data.message;
            }
        }

        if (data.type === "winner") {

            statusText.textContent =
                `${data.winner} wins!`;
        }

        if (data.type === "draw") {

            statusText.textContent =
                "Draw game!";
        }
    };

    socket.onclose = () => {

        statusText.textContent =
            "Disconnected.";
    };

    socket.onerror = () => {

        statusText.textContent =
            "Connection error.";
    };
}

cells.forEach(cell => {

    cell.addEventListener("click", () => {

        if (!socket) return;

        const position =
            Number(cell.dataset.cell);

        socket.send(JSON.stringify({
            move: position
        }));
    });

});

function updateBoard(board) {

    board.forEach((value, index) => {

        cells[index].textContent =
            value;
    });
}
