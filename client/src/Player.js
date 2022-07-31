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

    this.attackCollisionPos = [];
  }

  updateMovement = () => {
    // move any projectiles and attacks first
    let newAttackCollisionPos = [];
    
    if (this.attackCollisionPos) {
      for (let i = 0; i < this.attackCollisionPos.length; i++) {
        if (this.attackCollisionPos[i]) {
          if (this.attackCollisionPos[i][5] == 'punch') {
            newAttackCollisionPos.push([this.position[0], this.position[1] + 100, this.attackCollisionPos[i][2], this.attackCollisionPos[i][3], this.attackCollisionPos[i][4], this.attackCollisionPos[i][5]]);
          } else if (this.attackCollisionPos[i][5] == 'kick') {
            newAttackCollisionPos.push([this.position[0], this.position[1] + 250, this.attackCollisionPos[i][2], this.attackCollisionPos[i][3], this.attackCollisionPos[i][4], this.attackCollisionPos[i][5]]);
          } else if (this.attackCollisionPos[i][5] == 'throw_shurikens') {
            newAttackCollisionPos.push([this.attackCollisionPos[i][0] + (this.left ? -15 : 15), this.attackCollisionPos[i][1], this.attackCollisionPos[i][2], this.attackCollisionPos[i][3], this.attackCollisionPos[i][4], this.attackCollisionPos[i][5]]);
          }
        }
      } 
      this.setAttackCollision(newAttackCollisionPos);
    }
    

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
          if (this.frame_count == 8) {
            this.velocity[0] = this.left ? -10 : 10;
            this.addAttackCollision(
              this.position[0],
              this.position[1] + 100,
              (this.left ? -150 : 150),
              70,
              5,
              'punch'
            );
          } else if (this.frame_count == 17) {
            this.velocity[0] = this.left ? -5 : 5;
            this.removeAttackCollision('punch');
          } else if (this.frame_count >= 29) {
            this.frame_count = 0;
            this.velocity[0] = 0;
            this.attacking = false;
          }
        } else if (this.animation == 'kick') {
          if (this.frame_count == 15) {
            this.velocity[0] = this.left ? -2 : 2;
            this.addAttackCollision(
              this.position[0],
              this.position[1] + 250,
              (this.left ? -300 : 300),
              70,
              8,
              'kick'
            );
          } else if (this.frame_count == 30) {
            this.velocity[0] = this.left ? -10 : 10;
            this.removeAttackCollision(null, null, null, null, null, null);
          } else if (this.frame_count >= 35) {
            this.frame_count = 0;
            this.velocity[0] = 0;
            this.attacking = false;
          }
        } else if (this.animation == 'throw_shurikens') {
          if (this.frame_count == 14) {
            this.addAttackCollision(
              this.position[0] + (this.left ? -95 : 95),
              this.position[1] + 250,
              (this.left ? -50 : 50),
              50,
              5,
              'throw_shurikens'
            );
          } else if (this.frame_count >= 23) {
            this.frame_count = 0;
            this.velocity[0] = 0;
            this.attacking = false;
          }
        }
      }
      
      // start an attack, start init speed here
      if (this.keys['punch'] && !this.attacking && !this.jumping && !this.crouching) {
        this.attacking = true;
        this.animation = 'punch';
        this.velocity[0] = this.left ? -5 : 5;
      } else if (this.keys['kick'] && !this.attacking && !this.jumping && !this.crouching) {
        this.attacking = true;
        this.animation = 'kick';
        this.velocity[0] = this.left ? -10 : 10;
      } else if (this.keys['throw'] && !this.attacking && !this.jumping && !this.crouching) {
        this.attacking = true;
        this.animation = 'throw_shurikens';
      }

      // basic movement
      if (!this.attacking) {
        
        this.crouching = false;
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
          this.crouching = true;
          this.animation = 'crouch';
        }

        if (!this.keys['block']) {
          // this.animation = 'idle';
          this.blocking = false;
        } else if (this.keys['block'] && !this.jumping) {
          if (this.crouching) {
            this.animation = 'block_c';
          } else {
            this.animation = 'block_s';
          }
          this.blocking = true;
        }

    
        if (this.keys['w'] && !this.jumping) {
          this.animation = 'jump';
          this.jumping = true;
          this.crouching = false;
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
  
  addAttackCollision = (x, y, width, height, damage, attack) => {
    if (x && y && width && height && damage && attack) {
      this.attackCollisionPos.push([x, y, width, height, damage, attack]);
    }
  }

  // deleteProjectileCollision = () => {
  //   this.projectileCollisionPos = [];
  // }

  removeAttackCollision = (attack) => {
    const index = this.attackCollisionPos.indexOf(attack);
    this.attackCollisionPos.splice(index, 1);
  }

  getAttackCollision = () => {
    return this.attackCollisionPos;
  }

  // getProjectileCollision = () => {
  //   return this.projectileCollisionPos;
  // }

  getHealth = () => {
    return this.health;
  };

  getInfo = () => {
    return [this.position[0], this.position[1], this.animation, this.left];
  };

  isBlocking = () => {
    return this.blocking;
  }

  // addAttackCollision = (x, y, width, height, damage, attack) => {
  //   if (x && y && width && height && damage && attack) {
  //     this.attackCollisionPos = [x, y, width, height, damage, attack];
  //   } else {
  //     this.attackCollisionPos = null;
  //   }
  // };

  setAttackCollision = (attackCollision) => {
    this.attackCollisionPos = attackCollision;
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