window.onerror=function(){return true};var toprefer="m_ZJSTAT";var parentlocation="";var parentrefer="m_ZJSTAT";var selflocation=window.location;var selfrefer=document.referrer;var realrefer="";var reallocation="";var hourvisitnum=1;var realvisitnum=1;var nowdate=new Date();var clientcolor="";if (navigator.appName=="Netscape"){clientcolor=screen.pixelDepth;}else {clientcolor=screen.colorDepth;}hourvisitnum=document.cookie.match(new RegExp("(^| )m_ZJSTAT_PAGES=([^;]*)(;|$)"));hourvisitnum=(hourvisitnum==null)?1: (parseInt(unescape((hourvisitnum)[2]))+1);var currentdate =new Date();currentdate.setTime(currentdate.getTime()+60*60*1000);document.cookie="m_ZJSTAT_PAGES="+hourvisitnum+ ";path=/;expires="+currentdate.toGMTString();realvisitnum=document.cookie.match(new RegExp("(^| )m_ZJSTAT_TIMES=([^;]*)(;|$)"));if(realvisitnum==null){realvisitnum=1;}else{		realvisitnum=parseInt(unescape((realvisitnum)[2])); 		realvisitnum=(hourvisitnum==1)?(realvisitnum+1):(realvisitnum);}currentdate.setTime(currentdate.getTime()+365*24*60*60*1000);document.cookie="m_ZJSTAT_TIMES="+realvisitnum+";path=/;expires="+currentdate.toGMTString();realrefer=selfrefer;if(parentrefer!=="m_ZJSTAT"){realrefer=parentrefer;}if(toprefer!=="m_ZJSTAT"){realrefer=toprefer;} reallocation=parentlocation;try{lainframe}catch(e){reallocation=selflocation;}void('<iframe  target="_blank" src="httpdisabled://www.ipinyou.com/collect.jsp?mediaId=13472&stationId=13260&adPlaceId=2342&collectCode=2342&collectCodeType=2&hourVisitNum='+hourvisitnum+'&realVisitNum='+realvisitnum+'&zone='+(0-nowdate.getTimezoneOffset()/60)+'&screenColor='+clientcolor+'&screen='+screen.width+','+screen.height+'&referUrl='+escape(realrefer)+'&url='+escape(reallocation)+'" width="190" height="180"  frameborder="0" scrolling="no" marginwidth="0" marginheight="0"></iframe>');