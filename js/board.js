
var Board = function(app) {
  this.app = app;
  this.init();
}

Board.prototype = {

  elString: '<div id="board">' +
              '<div class="game-over">Game Over!</div>' +
              '<audio id="intro-music">' +
                 '<source src="music/legends-intro.mp3" /> ' +
              '</audio>' +
              '<audio id="game-music">' +
                 '<source src="music/legends-game.mp3" /> ' +
              '</audio>' +
            '</div>',

  margins: [20, 20, 20, 20],

  duration: 1000,

  init: function() {
    this.createEl();
    this.setBindings();
  },

  setBindings: function() {
    this.onWindowSizeChange = this.onWindowSizeChange.bind(this);
    this.onDocChange = this.onDocChange.bind(this);
    this.onNewDocChange = this.onNewDocChange.bind(this);
  },

  buildExisting: function() {
    this.app.doc.getModel().getRoot().addEventListener(gapi.drive.realtime.EventType.VALUE_CHANGED, this.onDocChange);
    this.data = this.app.doc.getModel().getRoot().get('boardState');
    this.el.querySelector('#game-music').play();
    this.build();
  },

  buildDemo: function() {
    this.app.doc.getModel().getRoot().addEventListener(gapi.drive.realtime.EventType.VALUE_CHANGED, this.onDocChange);
    this.el.querySelector('#intro-music').play();
    this.data = this.defaultBoard;
    this.build();
  },

  buildNew: function() {
    this.app.doc.getModel().getRoot().addEventListener(gapi.drive.realtime.EventType.VALUE_CHANGED, this.onDocChange);
    this.el.querySelector('#intro-music').pause();
    this.el.querySelector('#game-music').play();
    var that = this;
    this.data = this.emptyData;
    this.updateAll();
    setTimeout(function(){
      that.app.doc.getModel().getRoot().addEventListener(gapi.drive.realtime.EventType.VALUE_CHANGED, that.onNewDocChange);
    }, this.duration);
    
  },

  onNewDocChange: function() {
    this.app.doc.getModel().getRoot().removeEventListener(gapi.drive.realtime.EventType.VALUE_CHANGED, this.onNewDocChange);
    this.data = this.app.doc.getModel().getRoot().get('boardState');
    this.app.doc.getModel().getRoot().addEventListener(gapi.drive.realtime.EventType.VALUE_CHANGED, this.onDocChange);
    this.updateAll();
  },

  destroy: function() {
    this.app.doc.getModel().getRoot().removeEventListener(gapi.drive.realtime.EventType.VALUE_CHANGED, this.onDocChange);
  },

  build: function() {
    window.addEventListener('resize', this.onWindowSizeChange);
    this.setScales();

    this.healthBar = d3.select(this.el)
      .append('div')
      .attr('class', 'healthbar')
      .style('width', this.squareWidth)
      .style('height', (this.squareHeight * 5))
      .style('left', (-1 * this.squareWidth) + this.margins[3])
      .style('top', this.margins[0]);

    this.svgContainer = d3.select(this.el)
        .append('div')
      .attr('class', 'board-container')
      .style('width', this.svgSize.width)
      .style('height', this.svgSize.height)
      .style('margin', this.margins.join(' '));

    // this.cellsContainer = this.svgContainer.append('div');

    this.characterContainer = d3.select(this.el).append('div')
      .attr('class', 'character-container')
      .style('width', this.svgSize.width)
      .style('height', this.svgSize.height)
      .style('margin', this.margins.join(' '));

    this.hatchet = document.createElement('div');
    this.hatchet.classList.add('hatchet');
    this.hatchet.setAttribute('style', 'width: ' + this.squareWidth + '; height: ' + this.squareHeight + ';');
    this.hatchet.style.display = 'none';
    this.el.appendChild(this.hatchet);

    this.el.setAttribute('style', 'width:' + (this.svgSize.width + this.margins[1] + this.margins[3]) + 'px;');
    
    this.createCells();
    this.createCharacters(2000);

    this.createHealthBar();
  },

  onDocChange: function(evt) {
    var data = this.app.doc.getModel().getRoot().get('boardState');
    if (data.Version > this.data.Version) {
      if (data.GameState == 'dead') {
        this.gameEnded();
      } else {
        this.data = data;
        this.createCharacters();  
        this.createHealthBar();
      }
      console.log('updating according to brix');
    } else {
      console.log('brix is out of data, ignoring event');
    }
    
  },

  updateAll: function() {
    this.createCharacters();
    this.createCells();
    this.createHealthBar();
  },

  gameOver: function() {
    this.el.querySelector('.game-over').style.display = 'block';
  },

  setData: function(data) {
    if (data.Version > this.data.Version) {
      this.data = data;
      this.createCharacters();
      this.createHealthBar();
      if (data.GameState == 'dead') {
        this.gameEnded();
      }
      console.log('applying immediate change');
    } else {
      console.log('brix is more updated than immediate change');
    }
  },

  gameEnded: function() {
    this.app.game.hasEnded();
    this.destroy();
  },

  createCharacters: function(duration) {
    var that = this;

    this.characters = this.characterContainer.selectAll('div')
      .data(this.data.Objects, function(d) {
        return d.Id.toString();
      })

      this.characters
          .enter()
        .append('div')
        .style('left', function(d) {
          return that.scales.x(that.getRandomInt(0, that.data.Width));
        })
        .style('right', function(d) {
          return that.scales.y(that.getRandomInt(0, that.data.Height));
        })
        .style('width', 0)
        .style('height', 0);

      this.characters.transition().duration(duration ? duration : 75)
        .attr('class', function(d) {
          var dir = function() {
            if(that.data.PlayerDir.X != 0) {
              return that.data.PlayerDir.X > 0 ? 'right' : 'left';
            } else {
              return that.data.PlayerDir.Y > 0 ? 'down' : 'up';
            }
          }();
          return 'character ' + that.getCharacterClass(d.Type) + ' ' + dir;
        })
        .style('left', function(d) {
          return that.scales.x(d.Pos.X);
        })
        .style('top', function(d) {
          return that.scales.y(d.Pos.Y);
        })
        .style('width', this.squareWidth)
        .style('height', this.squareHeight);

      this.characters
          .exit().transition().duration(1000)
        .style('left', function(d) {
          return that.scales.x(that.getRandomInt(0, that.data.Width));
        })
        .style('right', function(d) {
          return that.scales.y(that.getRandomInt(0, that.data.Height));
        })
        .style('width', 0)
        .style('height', 0)
        .remove();
  },

  createCells: function() {
    var that = this;
    // Enter
    this.cells = this.svgContainer.selectAll('div')
        .data(this.getCellData());

    this.cells
        .enter()
      .append('div')
        .attr('class', 'tile')
        .style('left', function(d) {
          return that.scales.x(that.getRandomInt(0, that.data.Width));
        })
        .style('top', function(d) {
          return that.scales.y(that.getRandomInt(0, that.data.Height));
        })
        .style('width', 0)
        .style('height', 0)

    // Update
    this.cells.transition().duration(this.duration)
      .style('left', function (d) { return that.scales.x(d.x); })
      .style('top', function (d) { return that.scales.y(d.y); })
      .style('width', that.squareWidth)
      .style('height', that.squareHeight);

    // Exit
    this.cells
        .exit().transition().duration(this.duration)
      .style('left', function(d) {
        return that.scales.x(that.getRandomInt(0, 15));
      })
      .style('top', function(d) {
        return that.scales.y(that.getRandomInt(0, 15));
      })
      .style('width', 0)
      .style('height', 0)
      .remove();
  },

  createHealthBar: function() {
    var that = this;

    this.hearts = this.healthBar.selectAll('div')
        .data(this.getHealth(), function(d) {
            return d.id.toString();
          });
    
    this.hearts
        .enter()
      .append('div')
      .attr('class', function(d) {
        if (d.status == 0) {
          return 'empty';
        } else {
          return 'heart';
        }        
      })
      .style('width', that.squareWidth)
      .style('height', that.squareHeight);

    this.hearts
      .attr('class', function(d) {
        if (d.status == 0) {
          return 'empty';
        } else {
          return 'heart';
        }        
      })
      .style('width', that.squareWidth)
      .style('height', that.squareHeight);
  },

  getHealth: function() {
    var data = [];
    for(var i = 0; i < this.data.Health; i++){
      data.push({
        status: 1,
        id: function(index){
          return index;
        }(i)
      });
    }
    while(data.length < 5){
      data.push({
        status: 0,
        id: data.length
      });
    }
    return data;
  },

  // setHealth: function() {
  //   var health = this.data.Health;
  //   var heartData = [];
  //   for (var i = 0; i < 5; i++) {
  //     if (i <= health) heartData[i] = 1;
  //     else             heartData[i] = 0;
  //   }
  //   this.hearts = this.healthBar.selectAll('div').data(heartData);
  //   this.hearts
  //     .attr('class', function(d) {
  //       if (d == 0) return 'empty';
  //       else        return 'heart';
  //     });
  // },

  getCharacterClass: function(serverType) {
    switch(serverType) {
      case 'p':
        return 'player';
      case 'm':
        return 'monster';
      case 'b':
        return 'boss';
      case 't':
        return 'tree';
      case 'r':
        return 'rock';
    }
  },

  updateContainers: function() {
    this.svgContainer[0][0].setAttribute('width', this.svgSize.width);
    this.svgContainer[0][0].setAttribute('height', this.svgSize.height);
    this.characterContainer[0][0].setAttribute('width', this.svgSize.width);
    this.characterContainer[0][0].setAttribute('height', this.svgSize.height);
    this.el.setAttribute('style', 'width:' + (this.svgSize.width + this.margins[1] + this.margins[3]) + 'px;');
  },

  onWindowSizeChange: function() {
    this.setScales();
    this.createCells();
    this.updateContainers();
    this.createCharacters();
  },

  setScales: function() {
    var that = this;
    // Requires a more complicated algorithm to subtract height of elemnts in the header
    var availableHeight = function() {
      var height = window.innerHeight - that.margins[0] - that.margins[2];
      Array.prototype.forEach.call(document.querySelectorAll('.game')[0].children, function(element) {
        if (element.id != 'board') {
          height -= element.offsetHeight;
        }
      });
      return height;
    }();

    var availableWidth = window.innerWidth - this.margins[1] - this.margins[3];

    this.squareWidth = availableWidth / this.data.Width;
    this.squareHeight = availableHeight / this.data.Height;

    this.squareWidth = this.squareWidth > this.squareHeight ? this.squareHeight : this.squareWidth;
    this.squareHeight = this.squareHeight > this.squareWidth ? this.squareWidth : this.squareHeight;

    this.svgSize = {
      width: this.squareWidth * this.data.Width,
      height: this.squareHeight * this.data.Height
    }

    this.scales = {
      x: d3.scale.linear().domain([0, this.data.Width]).range([0, this.svgSize.width]),
      y: d3.scale.linear().domain([0, this.data.Height]).range([0, this.svgSize.height])
    }
  },

  getRandomInt: function(lowerBound, uppderBound) {
    return Math.floor(Math.random() * (uppderBound + 1));
  },

  getCellData: function() {
    var data = [];
    for (var i = 0; i < this.data.Width; i++) {
      for (var j = 0; j < this.data.Height; j++ ) {
        data.push({
          x: i,
          y: j
        });
      }
    }
    return data;
  },

  showHatchet: function() {
    console.log('showint hatchet');
    var x = this.data.PlayerDir.X + this.data.Objects[0].Pos.X;
    var y = this.data.PlayerDir.Y + this.data.Objects[0].Pos.Y;

    var left = this.scales.x(x) + this.margins[3];
    var top = this.scales.y(y) + this.margins[0];

    var that = this;
    
    this.hatchet.style.left = left;
    this.hatchet.style.top = top;
    this.hatchet.style.display = 'block';



    var dir = function() {
      if(that.data.PlayerDir.X != 0) {
        return that.data.PlayerDir.X > 0 ? 'right' : 'left';
      } else {
        return that.data.PlayerDir.Y > 0 ? 'down' : 'up';
      }
    }();

    this.hatchet.className = 'hatchet ' + dir + '1';

    setTimeout(function() {
      that.hatchet.className = 'hatchet ' + dir + '2';
      setTimeout(function() {
        that.hatchet.style.display = 'none';
      }, 150);
    }, 150);
  },

  createEl: function() {
    var div = document.createElement('div');
    div.innerHTML = this.elString;
    this.el = div.children[0];
  },

  emptyData: {
    "Width": 0,
    "Height": 0,
    "Version": -1,
    "Objects": []
  },

  defaultBoard: {
      "Width": 15,
      "Height": 15,
      "Version": -1,
      "PlayerDir": {
        "X":1,
        "Y":0
      },
      "Health": 5,
      "Objects": [
          {
              "Pos": {
                  "X": 10,
                  "Y": 10
              },
              "Type": "p",
              "Id": 0
          },
          {
              "Pos": {
                  "X": 6,
                  "Y": 13
              },
              "Type": "m",
              "Id": 1
          },
          {
              "Pos": {
                  "X": 7,
                  "Y": 14
              },
              "Type": "m",
              "Id": 2
          },
          {
              "Pos": {
                  "X": 2,
                  "Y": 8
              },
              "Type": "r",
              "Id": 3
          },
          {
              "Pos": {
                  "X": 10,
                  "Y": 8
              },
              "Type": "t",
              "Id": 4
          },
          {
              "Pos": {
                  "X": 6,
                  "Y": 4
              },
              "Type": "b",
              "Id": 5
          }
      ]
  }
}



