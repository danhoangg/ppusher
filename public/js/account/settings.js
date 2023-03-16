function resetPassword() {
    var oldpassword = document.getElementById('oldpassword').value;
    var newpassword = document.getElementById('newpassword').value;

    if (!validateInfo(oldpassword, newpassword)) return false;

    fetch('/account/resetpassword', {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify({
        oldpassword: oldpassword,
        newpassword: newpassword
    }),
      headers: {
        'content-type': 'application/json'
      }
    }).then(res => {
        res.json().then(data => {
            $('#resetpassworderr').text(data.msg);
        })  
    });
}

function validateInfo(oldpassword, newpassword) {
    if(!oldpassword || !newpassword) {
        $('#resetpassworderr').text('One or more entries are empty')
        return false;
    } else {
        return true;
    }
}

function rescheckagain() {
    if (confirm("Are you sure you want to reset your account fully, note this will delete all your data and you will have to start again?")) {
        let username = prompt("Please enter your username to confirm");
        
        resetAccount(username);
    }
}

function delcheckagain() {
    if (confirm("Are you sure you want to delete your account fully?")) {
        let username = prompt("Please enter your username to confirm");
        
        deleteAccount(username);
    }
}

function resetAccount(username) {
    fetch('/account/resetaccount', {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify({
            username: username
        }),
        headers: {
          'content-type': 'application/json'
        }
      }).then(res => {
          if (res.status === 403) {
            $('#resetaccounterr').text("Usernames don't match");
          } else {
            $('#resetaccounterr').text('Account successfully reset');
          }
      });
}

function deleteAccount(username) {
    fetch('/account/deleteaccount', {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify({
            username: username
        }),
        headers: {
          'content-type': 'application/json'
        }
      }).then(res => {
          if (res.status === 403) {
            $('#deleteaccounterr').text("Usernames don't match");
          } else {
            window.location.href = '/account/login';
          }
      });
}