let fs=require('fs');
let rng=require('random-js');
let tr=require('tor-request');
let nm=require('nodemailer');

// Tor configuration details.
tr.setTorAddress('localhost',9051);
tr.TorControlPort.port=9052;
tr.TorControlPort.password='fill';

// Object defining the request to be made via Tor.
let requestObj={
  url:'https://www.banggood.com/new-arrivals-c-133-2-40.html',
  headers:{
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko'
  }
}

let items=[]; // Array of Banggood item urls, maintained such that it does not exceed 40 items.
let reqQ=0; // Quantity of requests made on the current Tor session, a new Tor session is automatically created every 10.

// Generates and returns a cryptographically-secure pseudo-random float between 0 and 1, endpoint inclusive.
function rn(){
  let rngE=new rng(rng.engines.browserCrypto);
  return rngE.real(0,1,1);
}

// Renews current Tor session (gets new IP from the Tor network essentially) and calls the check function once a new session has successfully been established.
function renewTorS(){
  tr.renewTorSession(function(e,d){
    if (e){
      setTimeout(function(){renewTorS();},40000);
    }
    else{
      reqQ=0;
      check();
    }
  })
}

// Sends email defined by emailConf via email service defined by transporter.
function sendEmail(){
  let transporter=nm.createTransport({
    service:"gmail",
    auth:{
      user:'fill',
      pass:'fill'
    }
  });
  let emailConf={
    from:'BG New Arrivals Notifier<fill@gmail.com>',
    to:'fill@gmail.com',
    subject:'New Arrivals',
    text:'New Arrivals - http://www.banggood.com/new-arrivals-c-133-2-40.html'
  };
  transporter.sendMail(emailConf,function(e,d){});
}

// Primary function, periodically checks for new product arrivals RC Toys & Hobbies category on Banggood.com
// by making a request through Tor to the appropriate Url, extracting item Urls, and
// determining if any are new. A notification email is sent if any are. From here, the function has two
// behaviors: if 10 requests have not yet been made on the current Tor session, it calls itself after a
// randomized delay; if 10 have, it calls renewTorS, which, after establishing a new Tor session, calls
// check.

function check(){
  tr.request(requestObj,function(e,r,b){
    if (!b||e){
      renewTorS();
    }
    else{
      console.log(b);
      let ni=0;
      let si=b.indexOf('good_box_min5');
      let newItems=[];
      if (si==-1){
        renewTorS();
      }
      else{
        for (let i=0;i<40;i++){
          let cUrl=b.slice(b.indexOf('href=',si)+6,b.indexOf('?',si));
          si=b.indexOf('</li>',si+1);
          if (items.indexOf(cUrl)==-1){
            newItems.push(cUrl);
            ni=1;
          }
        }
        newItems.reverse();
        items=items.concat(newItems);
        while (items.length>40){
          items.shift();
        }
        if (ni==1){
          sendEmail();
        }
        reqQ++;
        if (reqQ%10==0){
          renewTorS();
        }
        else{
          setTimeout(function(){check()},15000+rn()*30000);
        }
      }
    }
  })
}

check();