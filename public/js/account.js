function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  let expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

//functions for sending post requests to the server to either login or signup
function submitSignup() {
  if (!CheckInfo()) return;

  fetch('/account/signup', {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify({ username: document.getElementById('username').value, password: document.getElementById('password').value, email: document.getElementById('email').value, startingBal: document.getElementById('startingBal').value }),
    headers: {
      'content-type': 'application/json'
    }
  }).then(response => {
    if (response.redirected) {
      window.location.href = response.url;
    } else {
      userError = document.getElementById('error1');
      userError.textContent = "Username already exists";
    }
  });
}

function submitLogin() {
  fetch('/account/login', {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify({ username: document.getElementById('username').value, password: document.getElementById('password').value }),
    headers: {
      'content-type': 'application/json'
    }
  }).then(response => {
    if (response.redirected) {
      window.location.href = response.url;
    } else {
      userError = document.getElementById('error1');
      userError.textContent = "Incorrect username or password";
    }
  });
}

//Checks whether the info submitted is valid to be signed up
//checks if passwords match, if email is in correct format, if starting balance is valid number
//Also checks if all the entries have been submitted
function CheckInfo() {
  var username = document.getElementById('username').value;
  var password = document.getElementById('password').value;
  var repassword = document.getElementById('repassword').value;
  var email = document.getElementById('email').value;
  var startingBal = document.getElementById('startingBal').value;
  mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/

  if (!username || !password || !repassword || !email || !startingBal) {
    alert('One or more entries are empty');
    return false;
  } else if (password != repassword) {
    document.getElementById('error3').textContent = "Passwords don't match";
    return false;
  } else if (!email.match(mailformat)) {
    document.getElementById('error4').textContent = "Invalid email";
    return false;
  } else if (isNaN(startingBal)) {
    document.getElementById('error5').textContent = "Invalid value";
    return false;
  } else if (startingBal < 10000 || startingBal > 1000000) {
    document.getElementById('error5').textContent = "Valid values range between 10k and 1m";
    return false;
  } else {
    return true;
  }
}

function forgotpwusername() {
  var username = $('#username').val();

  if (!username) {
    $('#error1').text('Please enter your username');
    return;
  }

  fetch('/account/checkusername', {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify({ username: username }),
    headers: {
      'content-type': 'application/json'
    }
  }).then(res => {
    if (res.status !== 200) {
      $('#error1').text('Username does not exist');
    } else {
      $('#forgotpw').addClass("d-none");
      $('#forgotpw2').removeClass("d-none");
    }
  });
}

function resendpwcode() {
  var username = $('#username').val();

  if (!username) {
    $('#error1').text('Please enter your username');
    return;
  }

  fetch('/account/checkusername', {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify({ username: username }),
    headers: {
      'content-type': 'application/json'
    }
  })
}

function forgotpwcode() {
  let username = $('#username').val();
  let code = $('#code').val();

  if (!username) {
    $('#error1').text('Please enter your username');
    return;
  } else if (!code) {
    $('#error2').text('Please enter a code');
    return;
  }

  fetch('/account/checkcode', {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify({ username: username, code: code }),
    headers: {
      'content-type': 'application/json'
    }
  }).then(res => {
    if (res.status !== 200) {
      $('#error2').text('Incorrect or expired code');
    } else {
      $('#forgotpw2').addClass("d-none");
      $('#forgotpw3').removeClass("d-none");
    }
  });
}

function newpassword() {
  let username = $('#username').val();
  let password = $('#password').val();
  let repassword = $('#repassword').val();

  if (!username) {
    $('#error1').text('Please enter your username');
    return;
  } else if (!password) {
    $('#error3').text('Please enter a new password');
    return;
  } else if (password !== repassword) {
    $('#error3').text("Passwords don't match");
    return;
  }

  fetch('/account/newpassword', {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify({ username: username, password: password }),
    headers: {
      'content-type': 'application/json'
    }
  }).then(res => {
    if (res.status !== 200) {
      $('#error3').text('Something went wrong');
    } else {
      window.location.href = '/account/login';
    }
  });
}