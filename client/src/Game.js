import { Player } from "./Player.js";

class Game {
  constructor(socket1, socket2) {
    let time = 99;
    this.socket1 = socket1;
    this.socket2 = socket2;
    this.player1 = new Player(2000 / 3, 550);
    this.player2 = new Player(4000 / 3, 550);

    // clock
    setInterval(() => {
      if (time >= 0) {
        this.socket1.emit('time', time);
        this.socket2.emit('time', time);
        time -= 1
      } else {
          if (this.player1.getHealth() > this.player2.getHealth()) {
            this.socket1.emit('game-over', 1);
            this.socket2.emit('game-over', 1);
          } else if (this.player1.getHealth() < this.player2.getHealth()) {
            this.socket1.emit('game-over', 2);
            this.socket2.emit('game-over', 2);
          } else {
            this.socket1.emit('game-over', 0);
            this.socket2.emit('game-over', 0);
          }
      }
    }, 1000);

    this.socket1.on("action", (data) => {
      this.player1.setKeys(data["keys"]);
      this.player1.setDelta(data["delta"]);
    });
    this.socket2.on("action", (data) => {
      this.player2.setKeys(data["keys"]);
      this.player2.setDelta(data["delta"]);
    });
  }

  // updates the position and movement flags
  updateMovement = () => {
    // check collisions and stuff
    this.checkLeft();
    this.checkAttackCollision();
    this.checkPlayerCollision();
    this.player1.updateMovement();
    this.player2.updateMovement();
    this.socket1.emit("new-info", {
      player1Info: this.player1.getInfo(),
      player2Info: this.player2.getInfo(),
      attackCollisionPos1: this.player1.getAttackCollision(),
      attackCollisionPos2: this.player2.getAttackCollision(),
    });

    this.socket2.emit("new-info", {
      player1Info: this.player1.getInfo(),
      player2Info: this.player2.getInfo(),
      attackCollisionPos1: this.player1.getAttackCollision(),
      attackCollisionPos2: this.player2.getAttackCollision(),
    });
  };

  updatePosition = () => {
    this.player1.updatePosition();
    this.player2.updatePosition();
  };

  draw = () => {
    if (this.player1.getHealth() == 0 && this.player2.getHealth() == 0) {
      this.socket1.emit('game-over', 0);
      this.socket2.emit('game-over', 0);
    } else if (this.player1.getHealth() <= 0) {
      this.socket1.emit('game-over', 2);
      this.socket2.emit('game-over', 2);
    } else if (this.player2.getHealth() <= 0) {
      this.socket1.emit('game-over', 1);
      this.socket2.emit('game-over', 1);
    }
    this.socket1.emit("render");
    this.socket2.emit("render");
  };

  checkLeft = () => {
    const player1Pos = this.player1.getInfo();
    const player2Pos = this.player2.getInfo();
    if (player1Pos[0] > player2Pos[0]) {
      this.player1.setLeft(true);
      this.player2.setLeft(false);
    } else if (player1Pos[0] <= player2Pos[0]) {
      this.player1.setLeft(false);
      this.player2.setLeft(true);
    }
  };

  // check for player collision
  checkPlayerCollision = () => {
    const player1Pos = this.player1.getInfo();
    const player2Pos = this.player2.getInfo();
    let colliding = false;
    if (
      // collide with each other
      player1Pos[0] + 90 >= player2Pos[0] - 90 &&
      player1Pos[0] - 90 <= player2Pos[0] + 90 &&
      player1Pos[1] <= player2Pos[1] + 225 &&
      player1Pos[1] + 225 >= player2Pos[1]
    ) {
      if (!player1Pos[3] && player2Pos[3]) {
        this.player1.setCollide("right");
        this.player2.setCollide("left");
        colliding = true;
      } else if (player1Pos[3] && !player2Pos[3]) {
        this.player1.setCollide("left");
        this.player2.setCollide("right");
        colliding = true;
      }
    }

    if (player2Pos[0] + 95 >= 2000 && player2Pos[3]) {
      // collide with wall
      colliding = true;
      this.player2.setCollide("right");
    } else if (player1Pos[0] + 95 >= 2000 && player1Pos[3]) {
      // collide with wall
      colliding = true;
      this.player1.setCollide("right");
    } else if (player2Pos[0] - 95 <= 0 && !player2Pos[3]) {
      // collide with wall
      colliding = true;
      this.player2.setCollide("left");
    } else if (player1Pos[0] - 95 <= 0 && !player1Pos[3]) {
      // collide with wall
      colliding = true;
      this.player1.setCollide("left");
    }

    if (!colliding) {
      this.player1.setCollide("none");
      this.player2.setCollide("none");
    }
  };

  // check for attack collision
  checkAttackCollision = () => {
    const player1Pos = this.player1.getInfo();
    const player2Pos = this.player2.getInfo();
    let attackCollisionPos1 = this.player1.getAttackCollision();
    let attackCollisionPos2 = this.player2.getAttackCollision();

    // check if first player is dealing damage
    if (attackCollisionPos1) {
      if (
        attackCollisionPos1[0] + attackCollisionPos1[2] >= player2Pos[0] - 75  &&
        attackCollisionPos1[0] <= player2Pos[0] + 75 &&
        attackCollisionPos1[1] <= player2Pos[1] + 400  &&
        attackCollisionPos1[1] + attackCollisionPos1[3] >= player2Pos[1]
      ) {
        this.player2.setHealth(this.player2.getHealth() - attackCollisionPos1[4])
        this.player1.setAttackCollision(null, null, null, null, null);
        this.socket1.emit("damage", [2, this.player2.getHealth()]);
        this.socket2.emit("damage", [2, this.player2.getHealth()]);
      } else if (
        attackCollisionPos1[0] >= player2Pos[0] - 75 &&
        attackCollisionPos1[0] + attackCollisionPos1[2] <= player2Pos[0] + 75 &&
        attackCollisionPos1[1] <= player2Pos[1] + 400 &&
        attackCollisionPos1[1] + attackCollisionPos1[3] >= player2Pos[1]
      ) {
        this.player2.setHealth(this.player2.getHealth() - attackCollisionPos1[4])
        this.player1.setAttackCollision(null, null, null, null, null);
        this.socket1.emit("damage", [2, this.player2.getHealth()]);
        this.socket2.emit("damage", [2, this.player2.getHealth()]);
      } else {
        this.player1.setAttackCollision(player1Pos[0], player1Pos[1], attackCollisionPos1[2], attackCollisionPos1[3], attackCollisionPos1[4]);
      }
    }

    // check if second player is dealing damage
    if (attackCollisionPos2) {
      if (
        attackCollisionPos2[0] + attackCollisionPos2[2] >= player1Pos[0] - 75 &&
        attackCollisionPos2[0] <= player1Pos[0] + 75 &&
        attackCollisionPos2[1] <= player1Pos[1] + 400 &&
        attackCollisionPos2[1] + attackCollisionPos2[3] >= player1Pos[1]
      ) {
        this.player1.setHealth(this.player1.getHealth() - attackCollisionPos2[4])
        this.player2.setAttackCollision(null, null, null, null, null);
        this.socket1.emit("damage", [1, this.player1.getHealth()]);
        this.socket2.emit("damage", [1, this.player1.getHealth()]);
      } else if (
        attackCollisionPos2[0] >= player1Pos[0] - 75 &&
        attackCollisionPos2[0] + attackCollisionPos2[2] <= player1Pos[0] + 75 &&
        attackCollisionPos2[1] <= player1Pos[1] + 400 &&
        attackCollisionPos2[1] + attackCollisionPos2[3] >= player1Pos[1]
      ) {
        this.player1.setHealth(this.player1.getHealth() - attackCollisionPos2[4])
        this.player2.setAttackCollision(null, null, null, null, null);
        this.socket1.emit("damage", [1, this.player1.getHealth()]);
        this.socket2.emit("damage", [1, this.player1.getHealth()]);
      } else {
        this.player2.setAttackCollision(player2Pos[0], player2Pos[1], attackCollisionPos2[2], attackCollisionPos2[3], attackCollisionPos2[4]);
      }
    }
  };
}

export { Game };
