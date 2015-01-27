function onHover(event) {
  var hovered = getMouseObject(event);
  var onHole = false;
  // If you're hovering on an atom and the cursor's a single bond
  if (!App.clicked && hovered && hovered.object.userData.pieceName === 'atom'
  && $('html').attr('id') === 'single-bond') {
    var atom = hovered.object;
    // If you're hovering on a hole and the hole's empty:
    // For each hole this atom has,
    for (var i = 0; i < atom.userData.holeFaceNums.length; i++) {
      var holeNum = atom.userData.holeFaceNums[i];
      // if you're hovering on a face in that hole
      if (App.holeFaces[holeNum][0] <= hovered.faceIndex && hovered.faceIndex <= App.holeFaces[holeNum][1]
      // and the hole isn't full
      && atom.userData.fullHoles.indexOf(holeNum) === -1) {
          changeHoleColor(0xD90065, atom, holeNum);
          onHole = true;
        App.highlighted = {object: 'hole', atom: atom, hole: holeNum, face: hovered};
      }
    }
  }
  // If you're hovering on a bondHead with an atom cursor
  else if (!App.clicked && hovered
  && hovered.object.userData.pieceName === 'bond head'
  && !hovered.object.children.length
  && $('html').attr('class') === 'atom-cursor') {
    hovered.object.material.color.setHex(0xD90065);
    App.highlighted = {object: 'bondHead', atom: atom,
    bond: hovered.object.parent, bondHead: hovered.object};
  }
  // If you're hovering on a single bond body with children,
  // and your cursor isn't an atom
  // the bond body's parent is the 'bond' grouping, children[0] is the
  // bond head. Any attached pieces are children of the bond head.
  else if (!$('html').attr('class') && hovered
  && hovered.object.parent.children[0].children.length
  && hovered.object.userData.pieceName === 'single bond body') {
    if (event.shiftKey) $('html').attr('id','rotateL');
    else $('html').attr('id','rotate');
  }
  // If you're hovering on a bond with children and your cursor is 'bond'
  else if ($('html').attr('id') === 'single-bond' && hovered
  && (hovered.object.userData.pieceName === 'single bond body'
  || hovered.object.userData.pieceName === 'double bond body')
  && hovered.object.parent.children[0].children.length) {
    var nextAtom = hovered.object.parent.children[0].children[0];
    var prevAtom = hovered.object.parent.parent;
    // if the two attached atoms each have a free bonding site
    if (nextAtom.userData.holeCount > nextAtom.userData.fullHoles.length
    && prevAtom.userData.holeCount > prevAtom.userData.fullHoles.length) {
        $('html').attr('id','upgrade-bond');
    }
  }
  // If the cursor is 'upgrade bond' and you're not on a bond body
  else if ($('html').attr('id') === 'upgrade-bond'
  && (!hovered || (hovered.object.userData.pieceName !== 'single bond body'
  && hovered.object.userData.pieceName !== 'double bond body'))) {
    $('html').attr('id','single-bond');
  }
  // If the cursor is 'rotate' and you're not on a bond body
  else if (($('html').attr('id') === 'rotate' || $('html').attr('id') === 'rotateL')
  && (!hovered || hovered.object.userData.pieceName !== 'single bond body')) {
    $('html').attr('id','');
  }
  // Unpaint hole when not hovered on
  if (!onHole && App.highlighted && App.highlighted.object === 'hole') {
    changeHoleColor(0x000000);
  }
  // Unpaint bondHead when not hovered on
  else if (App.highlighted && App.highlighted.object === 'bondHead'
  && (!hovered || hovered.object !== App.highlighted.bondHead)) {
    App.highlighted.bondHead.material.color.setHex(0xD3D3D3);
    App.highlighted = null;
  }
}

function onClick(event) {
  var faceIndex;
  var clickedObj;
  var clickedFace = getMouseObject(event);
  if (clickedFace && clickedFace.faceIndex) faceIndex = clickedFace.faceIndex;
  if (clickedFace && clickedFace.object) clickedObj = clickedFace.object;
  App.clicked = true;

  // Uncomment this to see face indexes on click
  // if (faceIndex) console.log(faceIndex);

  // if this is the first object
  if (App.objects.length === 0 && $('html').attr('class') === 'atom-cursor') {
    var newAtom = addAtom();
    App.scene.add(newAtom.mesh);
  }
  // If clickedObj is a bondHead
  else if (App.highlighted && App.highlighted.object === 'bondHead'
  && clickedObj === App.highlighted.bondHead) {
    var newAtom = addAtom(clickedObj);
    changeHoleColor(newAtom.mesh.userData.myColor, newAtom.mesh);
    newAtom.mesh.userData.fullHoles.push(0);
    clickedObj.material.color.setHex(0xD3D3D3);
  }
  // If clickedObj is a hole face
  else if (App.highlighted && clickedObj === App.highlighted.face.object
  && faceIndex === App.highlighted.face.faceIndex) {
    addSingleBond();
  }
  // If the cursor is 'rotate'
  else if ($('html').attr('id') === 'rotate') {
    // clickedObj.object.parent.rotateY(120*Math.PI/180);
    App.bondRotationTimer = setInterval(function() {
      clickedObj.parent.rotateY(2*Math.PI/180);
    }, 25);
  }
  else if ($('html').attr('id') === 'rotateL') {
    // clickedObj.object.parent.rotateY(120*Math.PI/180);
    App.bondRotationTimer = setInterval(function() {
      clickedObj.parent.rotateY(-2*Math.PI/180);
    }, 25);
  }
  // If the cursor is 'upgrade bond'
  else if ($('html').attr('id') === 'upgrade-bond') {
    var childAtom = clickedObj.parent.children[0].children[0];
    var parentAtom = clickedObj.parent.parent;
    upgradeBond(clickedObj.parent,childAtom,parentAtom);
  }
  if ($('html').attr('id') !== 'rotate' && !event.shiftKey) {
    $('html').attr('id','').attr('class','');
  }
}

function onMouseUp() {
  clearInterval(App.bondRotationTimer);
  App.clicked = false;
}

function addSingleBond() {
  App.states.push(App.scene.clone());
  var atom = App.highlighted.atom;
  var holeNum = App.highlighted.hole;
  var bond = new SingleBond(atom, holeNum);
  changeHoleColor(atom.userData.myColor);
  atom.userData.fullHoles.push(holeNum);
}

function addAtom(bond) {
  App.states.push(App.scene.clone());
  var holes, color;
  switch ($('html').attr('id')) {
    case 'black':
      holes = 4;
      color = 0x4F4F4F;
      break;
    case 'white':
      holes = 1;
      color = 0xffffff;
      break;
    case 'red':
      holes = 2;
      color = 0xff0000;
      break;
    case 'blue3':
      holes = 3;
      color = 0x0000ff;
      break;
    case 'blue4':
      holes = 4;
      color = 0x0000ff;
      break;
    case 'yellow4':
      holes = 4;
      color = 0xffff00;
      break;
    case 'yellow6':
      holes = 6;
      color = 0xffff00;
      break;
    case 'green':
      holes = 1;
      color = 0x267f00;
      break;
    case 'purple':
      holes = 4;
      color = 0x57007f;
      break;
    case 'gray':
      holes = 1;
      color = 0xc2c2c2;
      break;
  }
  var newAtom = new Atom(holes,color,bond);
  if (bond) {
    var bondRotation = bond.rotation.toArray();
    newAtom.mesh.rotation.fromArray(bondRotation);
    newAtom.mesh.rotateX(180*Math.PI/180);
  }
  return newAtom;
}

function changeHoleColor(hexColor, atomMesh, holeNum) {
  if (!atomMesh) {
    atom = App.highlighted.atom;
    holeNum = App.highlighted.hole;
  }
  else {
    atom = atomMesh;
    if (!holeNum) holeNum = 0;
  }
  // for all of the faceIndexes of this hole
  for (var i = App.holeFaces[holeNum][0]; i <= App.holeFaces[holeNum][1]; i++) {
    atom.geometry.faces[i].color.setHex(hexColor);
  }
  atom.geometry.colorsNeedUpdate = true;
  App.highlighted = null;
}
