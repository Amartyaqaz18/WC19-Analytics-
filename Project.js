// the purpose of this project is to download information of wc19 from cricinfo
// results in form of excel and pdf
// learn how to extract information from web

// npm init -y
// npm install minimist 
// npm install axios - to download
// npm install jsdom - extract info
// npm install excel4node - for making excel sheets
// nom install pdf-lib - for making pdfs

// node Project.js --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results --excel=WC19.csv --dataFolder=data

let minimist=require("minimist");
let axios=require("axios");
let jsdom=require("jsdom");
let excel4node=require("excel4node");
let pdf=require("pdf-lib");
let fs=require("fs");
let path=require("path");
let args=minimist(process.argv);

//download using axios
//read using jsdom

let responseKaPromise=axios.get(args.source);
responseKaPromise.then(function(response ){
    let html=response.data;
    let dom=new jsdom.JSDOM(html);
    let document=dom.window.document;

    let scoreblocks = document.querySelectorAll("div.ds-py-3");
    let matches=[];

    for(let i=0; i < scoreblocks.length; i++){
        let match={
        };
        
        let teamNames=scoreblocks[i].querySelectorAll("p.ds-capitalize");

        match.t1=teamNames[0].textContent;
        match.t2=teamNames[1].textContent;

        let teamScores=scoreblocks[i].querySelectorAll("strong");
        if(teamScores.length==2){
        match.t1s=teamScores[0].textContent;
        match.t2s=teamScores[1].textContent;
        }
        else if(teamScores.length==1){
            match.t1s=teamScores[0].textContent;
            match.t2s="";
        }
        else{
            match.t1s="";
            match.t2s="";
        }
        let matchResult=scoreblocks[i].querySelector("p.ds-text-typo-title>span");
        
        match.result=matchResult.textContent;
        matches.push(match);
    }

    let teams=[];
    for(let i=0;i<matches.length;i++){
        putTeamNamesInTeamsArray(teams,matches[i]);
    }

    for(let i=0;i<matches.length;i++){
        putMatchesOfEachTeamInTeamsArray(teams,matches[i]);
    }

    function putTeamNamesInTeamsArray(teams,match){
        let t1idx=-1;
        for(let i=0;i<teams.length;i++){
           if(teams[i].name==match.t1){
            t1idx=i;
            break;
           }
        }
        if(t1idx==-1){
            teams.push({
                name: match.t1,
                matches: []
            });
        }
        
        let t2idx=-1;
        for(let i=0;i<teams.length;i++){
           if(teams[i].name==match.t2){
            t2idx=i;
            break;
           }
        }
        if(t2idx==-1){
            teams.push({
                name: match.t2,
                matches: []
            });
        }

    }

    function putMatchesOfEachTeamInTeamsArray(teams,match){
        let t1idx=-1;
        for(let i=0;i<teams.length;i++){
           if(teams[i].name==match.t1){
            t1idx=i;
            break;
           }
        }
        teams[t1idx].matches.push({
            vs:match.t2,
            selfScore:match.t1s,
            oppScore:match.t2s,
            result:match.result,
        });
        
        let t2idx=-1;
        for(let i=0;i<teams.length;i++){
           if(teams[i].name==match.t2){
            t2idx=i;
            break;
           }
        }
        teams[t2idx].matches.push({
            vs:match.t1,
            selfScore:match.t2s,
            oppScore:match.t1s,
            result:match.result,
        });

    }
    let teamsJSON=JSON.stringify(teams);
    fs.writeFileSync("teams.json", teamsJSON, "utf-8");
    
    createExcelFile(teams);

    function createExcelFile(teams){
        let wb = new excel4node.Workbook();

        for(let i=0; i<teams.length; i++){
        let sheet = wb.addWorksheet(teams[i].name);

        sheet.cell(1,1).string("VS");
        sheet.cell(1,2).string("Self Score");
        sheet.cell(1,3).string("Opp Score");
        sheet.cell(1,4).string("Result");

        for(let j=0;j<teams[i].matches.length;j++){
        sheet.cell(2+j,1).string(teams[i].matches[j].vs);
        sheet.cell(2+j,2).string(teams[i].matches[j].selfScore);
        sheet.cell(2+j,3).string(teams[i].matches[j].oppScore);
        sheet.cell(2+j,4).string(teams[i].matches[j].result);
        }
        }
        wb.write(args.excel);
    }

        createFolders(teams);

        function createFolders(teams){
           if(fs.existsSync(args.dataFolder) == true){
            fs.rmSync(args.dataFolder, {recursive: true});
           }

           fs.mkdirSync(args.dataFolder);

            for(let i=0;i<teams.length;i++){
                let teamFN = path.join(args.dataFolder, teams[i].name);
                fs.mkdirSync(teamFN);

                for(let j=0;j<teams[i].matches.length;j++){
                    let matchFileName =path.join(teamFN, teams[i].matches[j].vs + ".pdf");
                    createScoreCard(teams[i].name, teams[i].matches[j], matchFileName);
                }
            }
        }

        function createScoreCard(teamName, match, matchFileName){
            let t1=teamName;
            let t2=match.vs;
            let t1s=match.selfScore;
            let t2s=match.oppScore;
            let resultofmatch=match.result;

            let bytesOfPDFTemplate= fs.readFileSync("Template.pdf");
            let pdfDocKaPromise = pdf.PDFDocument.load(bytesOfPDFTemplate);
            pdfDocKaPromise.then(function(pdfdoc){
                let page = pdfdoc.getPage(0);

                page.drawText(t1, {
                    x: 320,
                    y: 704,
                    size: 8
                });
                page.drawText(t2, {
                    x: 320,
                    y: 690,
                    size: 8
                });
                page.drawText(t1s, {
                    x: 320,
                    y: 676,
                    size: 8
                });
                page.drawText(t2s, {
                    x: 320,
                    y: 662,
                    size: 8
                });
                page.drawText(resultofmatch, {
                    x: 320,
                    y: 648,
                    size: 8
                });

                let finalPDFBytesKaPromise= pdfdoc.save();
                finalPDFBytesKaPromise.then(function(finalPDFBytes){
                    if(fs.existsSync(matchFileName + ".pdf") == true){
                        fs.writeFileSync(matchFileName + "1.pdf",finalPDFBytes);
                    }else{
                    fs.writeFileSync(matchFileName + ".pdf", finalPDFBytes);
                    }
                })
            })
        }

}).catch(function(err){
    console.log(err);
})