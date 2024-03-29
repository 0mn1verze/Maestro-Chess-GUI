var board = null
var game = new Chess()
var $board = $('#chess_board')
var $status = $('#status')
var $fen = $('#fen')
var $pgn = $('#pgn')
var $score = $('#score')
var $depth = $('#depth') 
var $nodes = $('#nodes')
var $time = $('#time')
var $knps = $('#knps')

// Grey squares
var whiteSquareGrey = '#a9a9a9'
var blackSquareGrey = '#696969'
var squareClass = 'square-55d63'
var squareToHighlight = null
var colorToHighlight = null

// Highlight square function
function highlightLastMove (move) {
  if (move.color === 'w') {
    $board.find('.' + squareClass).removeClass('highlight-white')
    $board.find('.square-' + move.from).addClass('highlight-white')
    squareToHighlight = move.to
    colorToHighlight = 'white'
  } else {
    $board.find('.' + squareClass).removeClass('highlight-black')
    $board.find('.square-' + move.from).addClass('highlight-black')
    squareToHighlight = move.to
    colorToHighlight = 'black'
  }
}

// Make move function
function make_move() {
  $("#make_move").prop('disabled', true)

  $.post('/make_move', {
    'fen': game.fen(),
    'fixed_depth': $('#fixed_depth option:selected').val(),
    'move_time': $('#move_time option:selected').val() 
  } , function(data) {
    var move = game.move(data.best_move, { sloppy: true })
    highlightLastMove(move)
    board.position(game.fen())

    // Update stats
    $score.html(data.score)
    $depth.html(data.depth)
    $nodes.html(data.nodes)
    $time.html(data.time)
    $knps.html(Math.round(Number($nodes.text()) / parseFloat($time.text())) / 1000)

    updateStatus()
    $("#make_move").prop('disabled', false)
  })

}

// Handle new game button
$('#new_game').on('click', function() {
  // Reset board state
  game.reset()

  // Set initial position
  board.position('start')

  // Update status
  updateStatus()

  // Update stats
  $score.html('')
  $depth.html('')
  $nodes.html('')
  $time.html('')
  $knps.html('')
})

// Handle make move button
$('#make_move').on('click', function() {
  make_move()
})

// Handle undo move button
$('#take_back').on('click', function() {
  game.undo()
  board.position(game.fen())
  updateStatus()
})

// Handle flip board button
$('#flip_board').on('click', function() {
  // Flip board
  board.flip()
})

// Handle move time dropdown
$('#move_time').on('change', function() {
  $('#fixed_depth').val('0')
})

// Handle fixed depth dropdown
$('#fixed_depth').on('change', function() {
  $('#move_time').val('0')
})

// Handle set fen button
$('#set_fen').on('click', function() {
  var fen = $fen.val().trim()
  if (game.load(fen))
    board.position(game.fen())
  else
    alert('Invalid FEN')

  updateStatus()
})

// Handle download button click
$('#download_button').on('click', function() {
  var date = new Date()

  var dateStr = date.toDateString()

  var pgn_header = '';

  pgn_header += '[Event "Chess Game"]\n'
  pgn_header += '[Site "https://maestro-chess-engine.herokuapp.com/"]\n'
  pgn_header += '[Date "' + dateStr + "]\n"
  pgn_header += '[Round "1"]\n'
  pgn_header += '[White ?]\n'
  pgn_header += '[Black ?]\n'

  if (game.in_checkmate()) {
    if (game.turn() === 'w')
      pgn_header += '[Result "1-0"]\n\n'
    else
      pgn_header += '[Result "0-1"]\n\n'
  }
  else if (game.in_draw())
    pgn_header += '[Result "1/2-1/2"]\n\n'
  else
    pgn_header += '[Result "*"]\n\n'

  console.log(pgn_header + game.pgn())

  $("#download_link").attr('download', 'game ' + dateStr + '.pgn')

  $("#download_link").attr('href', window.URL.createObjectURL(new Blob([pgn_header + game.pgn()], {type: 'text'})))

  $("#download_link")[0].click()
})

function removeGreySquares () {
  $board.find('.' + squareClass).css('background', '')
}

function greySquare (square) {
  var $square = $board.find('.square-' + square)

  var background = whiteSquareGrey
  if ($square.hasClass('black-3c85d')) {
    background = blackSquareGrey
  }

  $square.css('background', background)
}

function onDragStart (source, piece, position, orientation) {
  // do not pick up pieces if the game is over
  if (game.game_over()) return false

  // only pick up pieces for the side to move
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false
  }
}

// onDrop function
function onDrop (source, target) {
  removeGreySquares()

  // see if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q' // NOTE: always promote to a queen for example simplicity
  })

  highlightLastMove(move)

  // illegal move
  if (move === null) return 'snapback'

  make_move()

  updateStatus()
}

// Show legal moves when hovering over a piece
function onMouseoverSquare (square, piece) {
  // get list of possible moves for this square
  var moves = game.moves({
    square: square,
    verbose: true
  })

  // exit if there are no moves available for this square
  if (moves.length === 0) return

  // highlight the square they moused over
  greySquare(square)

  // highlight the possible squares for this piece
  for (var i = 0; i < moves.length; i++) {
    greySquare(moves[i].to)
  }
}

// Remove grey squares when mouse leaves the square
function onMouseoutSquare (square, piece) {
  removeGreySquares()
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd () {
  board.position(game.fen())
}

function onMoveEnd () {
  $board.find('.square-' + squareToHighlight)
    .addClass('highlight-' + colorToHighlight)
}

function updateStatus () {
  var status = ''

  var moveColor = 'White'
  if (game.turn() === 'b') {
    moveColor = 'Black'
  }

  // checkmate?
  if (game.in_checkmate()) {
    status = 'Game over, ' + moveColor + ' is in checkmate.'
  }

  // draw?
  else if (game.in_draw()) {
    status = 'Game over, drawn position'
  }

  // game still on
  else {
    status = moveColor + ' to move'

    // check?
    if (game.in_check()) {
      status += ', ' + moveColor + ' is in check'
    }
  }

  $status.html(status)
  $fen.val(game.fen())
  $pgn.html(game.pgn())
}

var config = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd,
  onMouseoverSquare: onMouseoverSquare,
  onMouseoutSquare: onMouseoutSquare,
  onMoveEnd: onMoveEnd
}

board = Chessboard('chess_board', config)

// Prevent scorlling on touch devices
$board.on('scroll touchmove touchend touchstart contextmenu', function(e) {
  e.preventDefault()
})

updateStatus()