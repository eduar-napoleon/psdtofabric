var canvas;
var PSD = require("psd");
// Meme process
function processMeme(memeInfo) {
  // Responsive canvas
  $(window).resize(resizeCanvas);
  function resizeCanvas() {
    var width = $(".fabric-canvas-wrapper").width();
    $(".canvas-container").css("width", width);
    $(".canvas-container").css(
      "height",
      (width * memeInfo.height) / memeInfo.width
    );
  }

  // Intialize fabric canvas
  canvas = new fabric.Canvas("meme-canvas", {
    width: memeInfo.width,
    height: memeInfo.height,
    selection: false,
    allowTouchScrolling: true,
  });

  // Scale is a range input allow small screen users to scale the object easily
  $("#scale").attr("max", canvas.width * 0.0025);
  $("#scale").val((canvas.width * 0.0025) / 2);

  resizeCanvas();

  // Add meme template as canvas background
  if (memeInfo.url) {
    fabric.Image.fromURL(
      `${memeInfo.url}`,
      function (meme) {
        canvas.setBackgroundImage(meme, canvas.renderAll.bind(canvas));
      },
      {
        crossOrigin: "anonymous",
      }
    );
  } else if (memeInfo.json) {
    canvas.loadFromJSON(memeInfo.json, canvas.renderAll.bind(canvas));
  }

  // Event: Add new text
  $("#add-text")
    .off("click")
    .on("click", function () {
      if ($("#text").val() == "") {
        showAlert("Error! Text field is empty");
        return;
      }

      // Create new text object
      var text = new fabric.Text($("#text").val(), {
        top: 10,
        left: 10,
        fontFamily: $("#font-family").find(":selected").attr("value"),
        textAlign: $('input[name="align"]:checked').val(),
        fontSize: $("#font-size").val(),
        fill: $("#cp-text").colorpicker("getValue"),
        fontStyle: $("#italic").attr("data"),
        fontWeight: $("#bold").attr("data"),
        underline: $("#underline").attr("data"),
        stroke: $("#cp-stroke").colorpicker("getValue"),
        strokeWidth: $("#stroke-width").val(),
        shadow: createShadow(
          $("#cp-shadow").colorpicker("getValue"),
          $("#shadow-depth").val()
        ),
        textBackgroundColor: getBackgroundColor(
          $("#cp-background").colorpicker("getValue")
        ),
        opacity: parseFloat($("#opacity").val() / 100),
      });

      text.scaleToWidth(canvas.width / 2);
      $("#scale").val(text.scaleX);

      canvas.add(text).setActiveObject(text);
      loadFont(text.fontFamily);
    });

  // Event: Add new image
  $("#add-image")
    .off("input")
    .on("input", function () {
      const file = this.files[0];
      const fileType = file["type"];
      $("#add-image").val("");

      if (!isImage(fileType)) {
        showAlert("Error! Invalid Image");
        return;
      }

      const reader = new FileReader();
      reader.onload = function () {
        var image = new Image();
        image.src = reader.result;
        image.onload = function () {
          fabric.Image.fromURL(
            reader.result,
            function (image) {
              image.scaleToWidth(canvas.width / 2);
              canvas.add(image).setActiveObject(image);
              $("#scale").val(image.scaleX);
            },
            {
              opacity: $("#opacity").val(),
            }
          );
        };
      };
      reader.readAsDataURL(file);
    });

  // Custom control
  fabric.Object.prototype.set({
    transparentCorners: false,
    cornerColor: "yellow",
    borderColor: "rgba(88,42,114)",
    cornerSize: parseInt(canvas.width) * 0.03,
    cornerStrokeColor: "#000000",
    borderScaleFactor: 2,
    padding: 4,
  });

  // add event listener handlers to edit methods
  loadObjectHandlers();

  // Update edit methods values to the selected canvas text
  canvas.on({
    "selection:created": updateInputs,
    "selection:updated": updateInputs,
    "selection:cleared": enableTextMethods,
  });

  $("#generate-meme")
    .off("click")
    .on("click", function () {
      console.log(JSON.stringify(canvas));
      var dataURL = canvas.toDataURL({
        format: "png",
      });

      var link = document.createElement("a");
      link.href = dataURL;
      link.download = createImgName();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
}

function deltaTransformPoint(matrix, point) {
  var dx = point.x * matrix.a + point.y * matrix.c + 0;
  var dy = point.x * matrix.b + point.y * matrix.d + 0;
  return { x: dx, y: dy };
}

function decomposeMatrix(matrix) {
  // @see https://gist.github.com/2052247

  // calculate delta transform point
  var px = deltaTransformPoint(matrix, { x: 0, y: 1 });
  var py = deltaTransformPoint(matrix, { x: 1, y: 0 });

  // calculate skew
  var skewX = (180 / Math.PI) * Math.atan2(px.y, px.x) - 90;
  var skewY = (180 / Math.PI) * Math.atan2(py.y, py.x);

  return {
    translateX: matrix.e,
    translateY: matrix.f,
    scaleX: Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b),
    scaleY: Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d),
    skewX: skewX,
    skewY: skewY,
    rotation: skewX, // rotation is the same as skew x
  };
}
var ddd = {
  xx: 0.9768115389520019,
  xy: 0.21410095135291024,
  yx: -0.21410095135291027,
  yy: 0.9768115389520023,
  tx: 252.73621934210445,
  ty: 117.96986418654765,
};
console.log(Math.round(Math.atan2(ddd.xy, ddd.yx) * (180 / Math.PI)));
console.log(
  decomposeMatrix({
    a: ddd.xx,
    b: ddd.yx,
    c: ddd.tx,
    d: ddd.xy,
    e: ddd.yy,
    f: ddd.ty,
  })
);

function toFabricJson(layer, scale, fx) {
  var arr = layer.export();

  if (arr.text) {
    // font colors
    let clr = arr.text.font.colors[0].reverse();
    clr.shift();
    // Nama Font
    let font = arr.text.font.name.replace(/(?:\\[rn]|[\r\n]+)+|\u0000/g, " ");
    // Ukuran Font
    let size = Math.round((arr.text.font.sizes[0] * arr.text.transform.yy) * 100) * 0.01;
    let height = Math.round((arr.text.font.sizes[0] * arr.text.transform.xx) * 100) * 0.01;
    console.log(font.trim());


    var dt = {
      type: "textbox",
      version: "4.4.0",
      originX: "left",
      originY: "top",
      left: arr.left,
      top: arr.top,
      width: arr.width,
      height: arr.height,
      fill: `rgb(${clr.reverse().toString()})`,
      stroke: "#000000",
      strokeWidth: 1,
      strokeDashArray: null,
      strokeLineCap: "butt",
      strokeDashOffset: 0,
      strokeLineJoin: "miter",
      strokeMiterLimit: 4,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      visible: true,
      backgroundColor: "",
      fillRule: "nonzero",
      paintFirst: "fill",
      globalCompositeOperation: "source-over",
      skewX: 0,
      skewY: 0,
      text: arr.text.value.replace(/(?:\\[rn]|[\r\n]+)+|\u0003/g, "\n"),
      fontSize: size,
      fontWeight: "",
      fontFamily: font.trim(),
      fontStyle: "",
      lineHeight: 1,
      underline: "",
      overline: false,
      linethrough: false,
      textAlign: arr.text.font.alignment[0],
      textBackgroundColor: "",
      charSpacing: 0,
      styles: {},
    };
    return dt;
  }
  var dt = {
    type: "image",
    version: "4.1.0",
    originX: "left",
    originY: "top",
    left: arr.left,
    top: arr.top,
    width: arr.width,
    height: arr.height,
    fill: "rgb(0,0,0)",
    stroke: `rgb(0,0,0)`,
    strokeWidth: fx.size,
    strokeDashArray: null,
    strokeLineCap: "butt",
    strokeDashOffset: 0,
    strokeLineJoin: "miter",
    strokeMiterLimit: 4,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    flipX: false,
    flipY: false,
    opacity: 100,
    shadow: null,
    visible: true,
    backgroundColor: "",
    fillRule: "nonzero",
    paintFirst: "fill",
    globalCompositeOperation: "source-over",
    skewX: 0,
    skewY: 0,
    cropX: 0,
    cropY: 0,
    crossOrigin: null,
    filters: [],
    src: layer.get("image").toBase64(scale),
  };
  return dt;
}

function getFabricJson(width, height) {
  return {
    version: "4.1.0",
    objects: [],
    backgroundImage: {
      type: "image",
      version: "4.1.0",
      originX: "left",
      originY: "top",
      left: 0,
      top: 0,
      width: width,
      height: height,
      fill: "rgb(255,255,255)",
      stroke: null,
      strokeWidth: 0,
      strokeDashArray: null,
      strokeLineCap: "butt",
      strokeDashOffset: 0,
      strokeLineJoin: "miter",
      strokeMiterLimit: 4,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      shadow: null,
      visible: true,
      backgroundColor: "",
      fillRule: "nonzero",
      paintFirst: "fill",
      globalCompositeOperation: "source-over",
      skewX: 0,
      skewY: 0,
      cropX: 0,
      cropY: 0,
      crossOrigin: "anonymous",
      filters: [],
    },
  };
}

async function convertPSD(file) {
  var psd = await PSD.fromDroppedFile(file);
  // console.log("PSD");
  // console.log(psd);
  var tree = psd.tree();
  // console.log(JSON.stringify(tree.export()));

  // canvas size
  var abcd = tree.descendants();
  var w = tree.get("width");
  var h = tree.get("height");
  var sc = 1;
  // var sc = Math.min(1, 1000 / w);
  var dt = getFabricJson(w * sc, h * sc);
  fx = new String;
  for (let i = 0; i < abcd.length; i++) {
    if (
      abcd[i].isGroup() ||
      !abcd[i].export().visible ||
      abcd[i].get("width") < 1
    )
      continue;

    // --------- GET GROUP CHILDREN-------------
    // let n = abcd[0]._children.length;
    // let b = abcd[0]._children[n - 1]._children.length;
    // console.log(abcd[0]._children[n - 1]);
    // console.log(abcd[i].get("name"));

    if (abcd[i].get("name") == "Background") {
      dt.backgroundImage.src = abcd[i].get("image").toBase64(sc);
      // console.log(abcd[i].export().visible.length);
      break;
    } else {
      // get layer fx data (stroke, stroke size)
      if (abcd[i].get("objectEffects") == undefined) {
        fx.colour = null;
        fx.size = 0;
      } else {
        node = abcd[i].get("objectEffects").data;
        const clr = Object.values(node.FrFX['Clr ']);
        console.log(clr);

        clr.shift();
        const sz = Object.values(node.FrFX['Sz  ']).pop();
        fx.colour = clr.toString();
        fx.size = sz;
        console.log(fx.colour);
      }
      dt.objects.push(toFabricJson(abcd[i], sc, fx));
    }
  }
  dt.objects = dt.objects.reverse();
  // console.log("DATA");
  console.log(dt);
  return dt;
}
