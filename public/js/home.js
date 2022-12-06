//This js is all for aesthetics, none of it contributes to the functionality of the code
document.addEventListener("DOMContentLoaded", function(event) {

    const showNavbar = (toggleId, navId, bodyId, headerId) =>{
    const toggle = document.getElementById(toggleId),
    nav = document.getElementById(navId),
    bodypd = document.getElementById(bodyId),
    headerpd = document.getElementById(headerId)

    // Validate that all variables exist
    if(toggle && nav && bodypd && headerpd){
    toggle.addEventListener('click', ()=>{
    // show navbar
    nav.classList.toggle('show')
    // change icon
    toggle.classList.toggle('bx-x')
    // add padding to body
    bodypd.classList.toggle('body-pd')
    // add padding to header
    headerpd.classList.toggle('body-pd')
    })
    }
    }

    showNavbar('header-toggle','nav-bar','body-pd','header')

    /*===== LINK ACTIVE =====*/
    const linkColor = document.querySelectorAll('.nav_link')

    function colorLink(){
    if(linkColor){
    linkColor.forEach(l=> l.classList.remove('active'))
    this.classList.add('active')
    }
    }
    linkColor.forEach(l=> l.addEventListener('click', colorLink))

     // Your code to run since DOM is loaded and ready
    });

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
