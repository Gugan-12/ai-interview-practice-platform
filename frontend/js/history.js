const API="http://localhost:5000/api/interview";
const token=localStorage.getItem("token");

async function loadHistory(){

const res=await fetch(`${API}/history`,{
headers:{Authorization:"Bearer "+token}
});

const interviews=await res.json();

const container=document.getElementById("historyContainer");

if(!interviews.length){

container.innerHTML=`
<div class="empty">

<h2>No past interview records</h2>

<p>If you want to attend an interview start one now.</p>

<button onclick="location.href='interview.html'">
Start Interview
</button>

<button onclick="location.href='index.html'">
Go Home
</button>

</div>
`;

return;
}

container.innerHTML="";

for(const interview of interviews){

const detailRes=await fetch(`${API}/details/${interview.id}`,{
headers:{Authorization:"Bearer "+token}
});

const details=await detailRes.json();

let rows="";

details.answers.forEach((a,i)=>{

rows+=`
<tr>
<td>Q${i+1}</td>
<td>${a.question}</td>
<td>${a.answer}</td>
</tr>
`;

});

let strengths="";
let improvements="";

if(details.feedback){

JSON.parse(details.feedback.strengths || "[]")
.forEach(s=>strengths+=`<li>${s}</li>`);

JSON.parse(details.feedback.improvements || "[]")
.forEach(i=>improvements+=`<li>${i}</li>`);

}

const card=document.createElement("div");

card.className="card";

card.innerHTML=`

<h3>Interview #${interview.interview_no}</h3>

<table>

<tr>
<th>No</th>
<th>Question</th>
<th>Answer</th>
</tr>

${rows}

</table>

${details.feedback?`

<div class="score-box">

<div class="score">
Technical: ${details.feedback.technical_score}/10
</div>

<div class="score">
Communication: ${details.feedback.communication_score}/10
</div>

<div class="score">
Confidence: ${details.feedback.confidence_score}/10
</div>

</div>

<h4>Strengths</h4>
<ul>${strengths}</ul>

<h4>Improvements</h4>
<ul>${improvements}</ul>

`:''}

`;

container.appendChild(card);

}

}

loadHistory();