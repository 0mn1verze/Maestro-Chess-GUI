# Web based GUI for Maestro Chess Engine

# import libraries
import chess
from flask import Flask, render_template, request
import chess.engine
import chess.polyglot

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

# make move API
@app.route("/make_move", methods=['POST'])
def make_move():
    # extract pgn string from HTTP POST request body
    fen = request.form.get('fen')

    # extract fixed depth value
    fixed_depth = request.form.get('fixed_depth')

    # extract move time value
    move_time = request.form.get('move_time')

    # init python-chess board object
    board = chess.Board(fen)

    
    with chess.polyglot.open_reader("OPTIMUS2403.bin") as reader:
        if reader.get(board) is not None:
            entry = reader.choice(board)
            return {"fen": board.fen(), 
                    "best_move": str(entry.move),
                    "score": "book move",
                    }

    # init Maestro engine
    engine = chess.engine.SimpleEngine.popen_uci("engine/Maestro.exe")

    if (move_time != "0"):
        if (move_time == "instant"):
            move_time = 0.2
        try:
            # get best move from Maestro engine
            info = engine.analyse(board, chess.engine.Limit(time=float(move_time)))
        except:
            info = {}
        
    
    if (fixed_depth != "0"):
        try:
            # get best move from Maestro engine
            info = engine.analyse(board, chess.engine.Limit(depth=int(fixed_depth)))
        except:
            info = {}

    # close engine
    engine.quit()

    try:
        # extract best move from result
        best_move = info["pv"][0]

        # update internal board state
        board.push(best_move)

        # extract pv moves
        pv_moves = [str(move) for move in info["pv"]]

        score = info["score"]

        if score.is_mate():
            score = str(score.relative)
        else:
            score = str(score.relative)
            score = str(int(score) / 100.0)

        # make move
        return {"fen": board.fen(), 
                "best_move": str(best_move),
                "score": score,
                "pv": " ".join(pv_moves),
                "nodes": str(info["nodes"]),
                "time": str(info["time"]),
                "depth": str(info["depth"]),
                "nps": str(info["nps"]),
                }
    except:
        return {
            "fen" : board.fen(),
            "score" : "#+1"
        }


if __name__ == "__main__":
    app.run(debug=True, threaded=True)
