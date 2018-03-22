import Rx from 'rx';

const PADDLE_KEYS = {
    left: 37,
    right: 39
};

const TICKER_INTERVAL = 17;
const PADDLE_SPEED = 240;
const FIELD_WIDTH = 900;
const FIELD_HEIGHT = 500;
const PADDLE_WIDTH = 160;
const PADDLE_HEIGHT = 30;
const BALL_SPEED = 60;
const BALL_RADIUS = 20;
const BRICK_ROWS = 5;
const BRICK_COLUMNS = 7;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 3;

const field = document.querySelector('.game');
const paddle = document.querySelector('.game__paddle');
const ball = document.querySelector('.game__ball');
const bricksContainer = document.querySelector('.game__bricks');
const bricks = factoryBricks();

const INITIAL_OBJECTS = {
    ballState: {
        position: {
            x: FIELD_WIDTH / 2,
            y: FIELD_HEIGHT / 2
        },
        direction: {
            x: 2,
            y: 2
        }
    },
    bricks: drawBricks(bricks, bricksContainer),
};

function init() {
  field.setAttribute('width', FIELD_WIDTH);
  field.setAttribute('height', FIELD_HEIGHT);
  paddle.setAttribute('width', PADDLE_WIDTH);
  paddle.setAttribute('height', PADDLE_HEIGHT);
  paddle.setAttribute('y', FIELD_HEIGHT - paddle.getAttribute('height'));
  paddle.setAttribute('x', FIELD_WIDTH / 2 - PADDLE_WIDTH / 2);
  ball.setAttribute('r', BALL_RADIUS);
}

function ballHasHit(object, direction) {
  let ballX = ball.getAttribute('cx') - BALL_RADIUS;
  let ballY = ~~(ball.getAttribute('cy') + BALL_RADIUS);
  let objectX = object.getAttribute('x');
  let objectY = object.getAttribute('y');
  let objectWidth = object.getAttribute('width');
  let objectHeight = object.getAttribute('height');

  let xDiff = ballX - objectX;
  let yDiff = ballY + direction.y - objectY

  return xDiff <= objectWidth
        && xDiff >= 0
        && yDiff <= objectHeight
        && yDiff >= 0;
}

function factoryBricks() {
    let width = (FIELD_WIDTH - BRICK_GAP - BRICK_GAP * BRICK_COLUMNS) / BRICK_COLUMNS;
    let bricks = [];
    for (let i = 0; i < BRICK_ROWS; i++) {
        for (let j = 0; j < BRICK_COLUMNS; j++) {
            bricks.push({
                x: j * (width + BRICK_GAP) + width / 2 + BRICK_GAP,
                y: i * (BRICK_HEIGHT + BRICK_GAP) + BRICK_HEIGHT / 2 + BRICK_GAP + 20,
                width: width,
                height: BRICK_HEIGHT
            });
        }
    }
    return bricks;
}

function drawBricks(bricks, bricksContainer) {
  console.log(bricks);

}

const ticker$ = Rx.Observable
  .interval(TICKER_INTERVAL, Rx.Scheduler.requestAnimationFrame)
  .map(() => ({
    time: Date.now(),
    deltaTime: null
  }))
  .scan(
    (previous, current) => ({
      time: current.time,
      deltaTime: (current.time - previous.time) / 1000
    })
  );

const input$ = Rx.Observable
  .merge(
    Rx.Observable.fromEvent(document, 'keydown', event => {
      switch (event.keyCode) {
        case PADDLE_KEYS.left:
          return -1;
        case PADDLE_KEYS.right:
          return 1;
        default:
          return 0;
      }
    }),
    Rx.Observable.fromEvent(document, 'keyup', event => 0)
  )
  .distinctUntilChanged();

const paddle$ = ticker$
  .withLatestFrom(input$)
  .scan((position, [ticker, direction]) => {
    let next = position + direction * ticker.deltaTime * PADDLE_SPEED;
    return Math.max(Math.min(next, FIELD_WIDTH - PADDLE_WIDTH), 0);
  }, FIELD_WIDTH / 2 - PADDLE_WIDTH / 2)
  .distinctUntilChanged();

const objects$ = ticker$
  .withLatestFrom(paddle$)
  .scan(({ballState}, [ticker, paddlePosition]) => {
    ballState.position.x = ballState.position.x + ballState.direction.x * ticker.deltaTime * BALL_SPEED;
    ballState.position.y = ballState.position.y + ballState.direction.y * ticker.deltaTime * BALL_SPEED;

    if (ballState.position.x < BALL_RADIUS || ballState.position.x > FIELD_WIDTH - BALL_RADIUS) {
      ballState.direction.x = -ballState.direction.x;
    }

    if(ballHasHit(paddle, ballState.direction) || ~~ballState.position.y < BALL_RADIUS ) {
        ballState.direction.y = -ballState.direction.y;
        console.log('ballHasHit');
    }
    return {
        ballState: ballState,
    };
  }, INITIAL_OBJECTS);


function update([ticker, paddlePosition, objects]) {
  paddle.setAttribute('x', paddlePosition);
  ball.setAttribute('cx', objects.ballState.position.x);
  ball.setAttribute('cy', objects.ballState.position.y);
}

init();

const game = Rx.Observable
  .combineLatest(ticker$, paddle$, objects$)
  .sample(TICKER_INTERVAL)
  .subscribe(update);
