for (let x = 0; x < res.data.length; x++) {
res.data[x].supervisor = JSON.parse(res.data[x].supervisor);
for (let y = 0; y < res.data[x].forms.length; y++) {
res.data[x].forms[y] = JSON.parse(res.data[x].forms[y]);
}
for (let y = 0; y < res.data[x].members.length; y++) {
res.data[x].members[y] = JSON.parse(res.data[x].members[y]);
}
}
