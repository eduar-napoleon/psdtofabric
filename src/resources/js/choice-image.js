$(function () {
  // Eevnt: Choice meme from top 100
  $(".memes-container").delegate("img", "click", function () {
    var $img = $(this);
    var imgInfo = {
      url: $img.attr("src"),
      height: $img.attr("img-height"),
      width: $img.attr("img-width"),
    };

    $(".choice-section").trigger("choice-done", imgInfo);
  });

  // Event: Upload local image
  $("#meme-input").on("change", async function () {
    const file = this.files[0];
    const fileType = file["type"];

    // Reset file input
    $("#meme-input").val("");

    // Validate this is image
    if (!isImage(fileType)) {
      if (file["name"].split(".").pop().toUpperCase() === "PSD") {
        var imgJson = await convertPSD(file);
        // console.log(JSON.stringify(imgJson));
        var imgInfo = {
          json: JSON.stringify(imgJson),
          height: imgJson.backgroundImage.height,
          width: imgJson.backgroundImage.width,
        };
        $(".choice-section").trigger("choice-done", imgInfo);
        return;
      }
      const reader = new FileReader();
      reader.onload = function () {
        var meme = JSON.parse(reader.result);
        if (meme.backgroundImage) {
          var imgInfo = {
            json: reader.result,
            height: meme.backgroundImage.height,
            width: meme.backgroundImage.width,
          };
          $(".choice-section").trigger("choice-done", imgInfo);
        } else {
          showAlert("Error! Invalid Image");
        }
      };
      reader.readAsText(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = function () {
      var meme = new Image();
      meme.src = reader.result;
      meme.onload = function () {
        var imgInfo = {
          url: reader.result,
          height: meme.height,
          width: meme.width,
        };
        $(".choice-section").trigger("choice-done", imgInfo);
      };
    };
    reader.readAsDataURL(file);
  });

  // Event: Choice was made
  $(".choice-section").on("choice-done", function (e, imgInfo) {
    $(".discription").fadeOut();
    $(".choice-section").fadeOut("normal", function () {
      $(".edit-section").removeClass("d-none").hide().fadeIn();
      $(".fabric-canvas-wrapper").append(`<canvas id="meme-canvas"></canvas>`);
      processMeme(imgInfo);
    });
  });

  // Event: Back button click
  $(".back-btn .btn").on("click", function () {
    $(".edit-section").fadeOut("normal", function () {
      $(".canvas-container").remove();
      $(".choice-section").fadeIn();
      $(".discription").fadeIn();
      enableTextMethods();
    });
  });
});
