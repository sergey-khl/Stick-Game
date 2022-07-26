class Player {
  constructor(initx, inity) {
    this.health = 100;
    this.jumping = false;
    this.crouching = false;
    this.animation = "idle";
    this.width = 250;
    this.height = 400;
    this.position = [initx, inity]
    this.velocity = [0, 0];
    this.acceleration = [0, 0];
    this.standing_height = inity;
    this.last_key;
    this.keys = { 'w': false, 'a': false, 's': false, 'd': false, 'punch': false, 'kick': false };
    this.curr_move = "none";
    this.delta = 1;
    this.frame_count = 0;
    this.left;
    this.attacking = false;
    this.hitting = false;
    this.collidingLeft = false;
    this.collidingRight = false;
    this.knockback = 0;

    this.attackCollisionPos = null;
  }

  updateMovement = () => {
    if (Math.abs(this.knockback) > 0) { // we are being knocked back
      this.frame_count += 1;
      if (this.frame_count <= 21) {
        this.velocity[0] = this.left ? this.knockback : -this.knockback;
      } else {
        this.velocity[0] = 0;
        this.setKnockback(0);
      }
    } else {
      // go frame by frame through an attack
      if (this.attacking) {
        this.frame_count += 1;
        if (this.animation == 'punch') {
          if (this.frame_count == 0) {
            this.velocity[0] = this.left ? -5 : 5;
            
          } else if (this.frame_count == 8) {
            this.velocity[0] = this.left ? -10 : 10;
            if (this.left) {
              this.setAttackCollision(
                this.position[0],
                this.position[1] + 100,
                -150,
                70,
                5
              );
            } else {
              this.setAttackCollision(
                this.position[0],
                this.position[1] + 100,
                150,
                70,
                5
              );
            }
          } else if (this.frame_count == 17) {
            this.velocity[0] = this.left ? -5 : 5;
            this.setAttackCollision(null, null, null, null, null);
          } else if (this.frame_count >= 29) {
            this.frame_count = 0;
            this.velocity[0] = 0;
            this.attacking = false;
          }
        }
      }
      
      // start an attack
      if (this.keys['punch'] && this.attacking == false && !this.jumping) {
        this.attacking = true;
        this.animation = 'punch';
      } else if (this.keys['kick'] && !this.attacking) {
        this.attacking = true;
        this.animation = 'kick';
      }

      // basic movement
      if (!this.attacking) {
        if (this.keys['d'] && this.keys['last'] == 'd') {
          this.animation = 'walk';
          this.velocity[0] = 10;
        } else if (this.keys['a'] && this.keys['last'] == 'a') {
          this.animation = 'walk';
          this.velocity[0] = -10;
        } else if (!this.keys['a'] && !this.keys['d']) {
          this.animation = 'idle';
          this.velocity[0] = 0;
        }
    
        if (!this.keys['a'] && !this.keys['d'] && !this.jumping && this.keys['s']) {
          this.animation = 'crouch';
        }
    
        if (this.keys['w'] && !this.jumping) {
          this.animation = 'jump';
          this.jumping = true;
          this.velocity[1] = -50;
          this.acceleration[1] = 2.5;
        }
      }
    }
      // jumping
      if (this.jumping) {
        this.animation = 'jump';
        // end jump
        if (this.position[1] > this.standing_height) {
          this.acceleration = [0, 0];
          this.velocity[1] = 0;
          this.jumping = false;
          this.position[1] = this.standing_height;
        }
      }

      // deny movement if collision
      if (this.collidingLeft && this.velocity[0] < 0) {
        this.velocity[0] = 0;
      }  else if (this.collidingRight && this.velocity[0] > 0) {
        this.velocity[0] = 0;
      }
  };

  updatePosition() {
    this.position[0] += this.velocity[0] * this.delta;
    this.position[1] += this.velocity[1] * this.delta;
    this.velocity[0] += this.acceleration[0] * this.delta;
    this.velocity[1] += this.acceleration[1] * this.delta;
  }
  
  getAttackCollision = () => {
    return this.attackCollisionPos;
  }

  getHealth = () => {
    return this.health;
  };

  getInfo = () => {
    return [this.position[0], this.position[1], this.animation, this.left];
  };

  setAttackCollision = (x, y, width, height, damage) => {
    if (x && y && width && height && damage) {
      this.attackCollisionPos = [x, y, width, height, damage];
    } else {
      this.attackCollisionPos = null;
    }
  };

  // indicate where the player is touching another
  setCollide = (collision) => {
    if (collision == "left") {
      this.collidingLeft = true;
    } else if (collision == "right") {
      this.collidingRight = true;
    } else if (collision == "none") {
      this.collidingLeft = false;
      this.collidingRight = false;
    }
  };

  setKeys = (keys) => {
    this.keys = keys;
  }

  setDelta = (delta) => {
    this.delta = delta;
  }

  setHealth = (health) => {
    this.health = health;
  };

  setKnockback = (power) => {
    if (power > 0) {
      this.frame_count = 0;
    }
    this.knockback = power;
  }

  setLeft = (left) => {
    this.left = left;
  };
}


export { Player };