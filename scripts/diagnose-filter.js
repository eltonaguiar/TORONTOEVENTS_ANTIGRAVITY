const fs=require('fs');
const events=JSON.parse(fs.readFileSync('data/events.json','utf8'));
const settings={hideSoldOut:false,gender:'unspecified',hideGenderSoldOut:false};
const maxPrice=120;
const showExpensive=false;
const showStarted=false;
const dateFilter='today';
const now=new Date('2026-01-26T14:00:00-05:00');

const getTorontoDateParts=(date)=>{
    if (Number.isNaN(date.getTime())) return 'invalid-date';
    const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'});
    const parts=formatter.formatToParts(date);
    const d={};
    parts.forEach(p=>d[p.type]=p.value);
    return ${d.year}--;
};

const isMultiDay=(event)=>{
    if (event.categories?.includes('Multi-Day')) return true;
    if (!event.endDate) return false;
    const start=new Date(event.date);
    const end=new Date(event.endDate);
    const diffTime=Math.abs(end.getTime()-start.getTime());
    const diffDays=Math.ceil(diffTime/(1000*60*60*24));
    return diffDays>1;
};

const inferSoldOutStatus=(text)=>{
    const uc=text.toUpperCase();
    const isSoldOut=uc.includes('SOLD OUT') && !uc.includes('NOT SOLD OUT');
    const malePatterns=['MALE TICKETS SOLD OUT','MALE SOLD OUT','MEN TICKETS SOLD OUT','GENTLEMEN SOLD OUT','MEN\'S SOLD OUT'];
    const femalePatterns=['FEMALE TICKETS SOLD OUT','FEMALE SOLD OUT','WOMEN TICKETS SOLD OUT','LADIES SOLD OUT','WOMEN\'S SOLD OUT'];
    const maleOut=malePatterns.some(p=>uc.includes(p));
    const femaleOut=femalePatterns.some(p=>uc.includes(p));
    let genderSoldOut='none';
    if (maleOut&&femaleOut) genderSoldOut='both';
    else if (maleOut) genderSoldOut='male';
    else if (femaleOut) genderSoldOut='female';
    return {isSoldOut,genderSoldOut};
};

const todayStr=getTorontoDateParts(now);
const tomorrowStr=getTorontoDateParts(new Date(now.getTime()+24*60*60*1000));

const isToday=(date)=>{
    return getTorontoDateParts(new Date(date))===todayStr;
};

const isTomorrow=(date)=>{
    return getTorontoDateParts(new Date(date))===tomorrowStr;
};

const isThisWeek=(date)=>{
    const eventDate=new Date(date);
    const todayParts=todayStr.split('-').map(Number);
    const startOfToday=new Date(todayParts[0],todayParts[1]-1,todayParts[2]);
    const weekEnd=new Date(startOfToday.getTime()+7*24*60*60*1000);
    return eventDate>=startOfToday && eventDate<=weekEnd;
};

const isThisMonth=(date)=>{
    const eventDate=new Date(date);
    const eventParts=getTorontoDateParts(eventDate).split('-');
    const todayParts=todayStr.split('-');
    return eventParts[0]===todayParts[0] && eventParts[1]===todayParts[1];
};

const validEvents=events.filter(e=>{
    const isHidden=e.status==='CANCELLED' || e.status==='MOVED';
    if (isHidden) return false;

    if (!showExpensive && e.priceAmount!==undefined && e.priceAmount>maxPrice) return false;

    const {isSoldOut:inferredSoldOut,genderSoldOut:inferredGenderOut}=inferSoldOutStatus(e.title+' '+(e.description||''));
    const isExplicitlySoldOut=e.isSoldOut===true || inferredSoldOut;
    if (settings.hideSoldOut && isExplicitlySoldOut) return false;
    if (settings.hideGenderSoldOut && settings.gender!=='unspecified') {
        const gender=settings.gender;
        const isGenderSoldOut=e.genderSoldOut==='both' || e.genderSoldOut===gender || inferredGenderOut==='both' || inferredGenderOut===gender;
        if (isGenderSoldOut) return false;
    }

    const eventStartDate=new Date(e.date);
    const eEndDate=e.endDate ? new Date(e.endDate) : eventStartDate;

    if (dateFilter!=='all' && now) {
        const todayParts=todayStr.split('-').map(Number);
        const todayStart=new Date(todayParts[0],todayParts[1]-1,todayParts[2]);

        if (dateFilter==='today') {
            const todayEnd=new Date(todayStart.getTime()+24*60*60*1000-1);
            if (isMultiDay(e)) {
                if (eEndDate<todayStart || eventStartDate>todayEnd) return false;
            } else {
                if (!isToday(e.date)) return false;
            }
        }
        if (dateFilter==='tomorrow') {
            const tomorrowStart=new Date(todayStart.getTime()+24*60*60*1000);
            const tomorrowEnd=new Date(tomorrowStart.getTime()+24*60*60*1000-1);
            if (isMultiDay(e)) {
                if (eEndDate<tomorrowStart || eventStartDate>tomorrowEnd) return false;
            } else {
                if (!isTomorrow(e.date)) return false;
            }
        }
        if (dateFilter==='this-week') {
            const weekEnd=new Date(todayStart.getTime()+7*24*60*60*1000);
            if (isMultiDay(e)) {
                if (eEndDate<todayStart || eventStartDate>weekEnd) return false;
            } else {
                if (!isThisWeek(e.date)) return false;
            }
        }
        if (dateFilter==='this-month') {
            if (isMultiDay(e)) {
                const eventStartParts=getTorontoDateParts(eventStartDate).split('-');
                const eventEndParts=getTorontoDateParts(eEndDate).split('-');
                const currentMonth=${todayStr.split('-')[0]}-;
                const startMonth=${eventStartParts[0]}-;
                const endMonth=${eventEndParts[0]}-;
                if (currentMonth<startMonth || currentMonth>endMonth) return false;
            } else {
                if (!isThisMonth(e.date)) return false;
            }
        }
    }

    return true;
});

console.log('validEvents count', validEvents.length);
