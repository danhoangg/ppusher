$(".lateststock").on('click', function(event){
  $('.lateststock').removeClass('activestock');
  $(this).addClass('activestock');
});

//UPDATE VALUES ON WEBSITE DASHBOARD
setInterval(() => {
  fetch('/home', {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'content-type': 'application/json'
    }
  }).then((res) => {
    res.json().then((arr) => {
      $("#totalpl").text(arr[0].totalpl)
      $("#totalpl").removeClass()
      $("#totalpl").addClass(arr[0].currentcolor)
      arr[1].forEach((element, i) => {
        $("#currentprice" + i).html(element.currentprice + "<small class='text-secondary'> USD &nbsp</small>")
        $("#percentchange" + i).text(element.percentage + "%")
        $("#percentchange" + i).removeClass()
        $("#percentchange" + i).addClass(element.percentagecolor)
      })
    })
  });
}, 5000)
