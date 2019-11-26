
var express = require('express');
var fs = require('fs');
var router = express.Router();

var connection = require('../index.js').connection;


// 공고 전
router.post("/before_apply_search", function (req, res, next) {

    //3. 지역
    // 3.0. 상관없음 ("location = 0"으로 보내주면 ㄳㄳ) 

    // -------------------- 3. 지역 -----------------------

    var arr_location = req.body.location;
    var location_SQL;

    if (arr_location[0] == "전국") {
        location_SQL = '';
    }
    else if (arr_location[1] == "전국") {
        location_SQL = "AND (dor LIKE '" + arr_location[0] + "%')";
    }
    else {
        location_SQL = "AND (dor LIKE '" + arr_location[0] + "%') AND (si LIKE '" + arr_location[1] + "%')";
    }

    if (location_SQL.length == 0)
        location_SQL = ' ';

    //4. 분야 (4개도 세분화해서 ㄱㄱ)
    //4.0. 상관 없음.
    //4.1. Employment_sup(취업지원) - 취업지원금, 서류/면접 지원, 취업지원 프로그램
    //4.2. Startup_sup(창업지원) - 시설/공간 제공, 정책 자금, 멘토링/컨설팅, 사업화
    //4.3. Life_welfare(생활, 복지) - 학자금, 대출/이자, 생활보조(금), 결혼/육아, 교통지원
    //4.4. Residential_financial(주거, 금융) - 기숙사/생활관, 주택지원, 주거환경지원, 고용장려금, 기업지원금

    // 예를 들어서 4.1 이랑 4.4에 관련된 거 찾고 싶으면 "01001"
    // 4.2 이랑 4.4에 관련된 거 찾고 싶으면 "00101"
    // "4.0. 상관없음"이면 "1xxxx" > x는 0이든 1이든 상관없다는 의미

    // -------------------- 4. 분야 -----------------------
    var categoryList = ["Employment_sup", "Startup_sup", "Life_welfare", "Residential_finance"];
    var category_SQL_temp = "(";

    // req.body.category : "01010" (string)
    var recv_category = req.body.category;


    if (recv_category[0] == 1) {
        recv_category = "11111";
    }

    for (var i = 1; i < 5; i++) {
        if (recv_category[i] == 1) {
            category_SQL_temp += categoryList[i - 1] + " = 1 OR ";
        }
    }
    category_SQL_temp = category_SQL_temp.substr(0, category_SQL_temp.length - 3) + ") ";
    category_SQL = category_SQL_temp;

    if (recv_category.length == 0)
        category_SQL = ' ';



    //5. 연령 - 
    //5.0 연령 제한 없음( "age = 0"으로 보내주면 ㄳㄳ)
    //5.1 integer (샘플 데이터로는 몇 개 못 뽑을 듯)
    var recv_age = req.body.age;
    var age_SQL = '';

    if (recv_age != 0 && recv_age != null)   // "연령 제한 없음"이 아니면
    {
        age_SQL = 'AND ' + 'end_age >= ' + recv_age + ' AND ' + 'start_age <= ' + recv_age + ' ';
    }

    //6. 키워드 기반 검색 - title, contents내에 해당 키워드가 있으면 ㅇㅋ
    var match_score_SQL = req.body.keyword;

    var ORDER_SQL;
    //var keyword_length = match_score_SQL.length;

    //keword input이 없을 때
    if (match_score_SQL == null || match_score_SQL.length == 0) {
        match_score_SQL = ' ';
        keyword_SQL = '';
        ORDER_SQL = "ORDER BY apply_end is null ASC, apply_end ASC";
    }
    else {
        //키워드 필터링
        var regex = /[가-힣A-Za-z0-9]+/g;

        var match = match_score_SQL.match(regex);

        var match_score_SQL = ', ';
        var keyword_SQL = 'AND (';

        if (match.length == 0)   //필터링된 키워드가 없을 때 
        {
            match_score_SQL = ' ';
            keyword_SQL = '';
            ORDER_SQL = "ORDER BY apply_end is null ASC, apply_end ASC";
        }

        for (var i = 0; i < match.length; i++) {
            //console.log(match[i]);
            //title, contents 
            match_score_SQL = match_score_SQL + '(title LIKE \"%' + match[i] + '%\")' + '+' + '(contents LIKE \"%' + match[i] + '%\") ' + '+ ';
            keyword_SQL = keyword_SQL + 'title LIKE \"%' + match[i] + '%\" OR contents LIKE \"%' + match[i] + '%\" OR ';
            //console.log(match_score_SQL);
        }
        match_score_SQL = match_score_SQL.substring(0, match_score_SQL.length - 2);
        match_score_SQL = match_score_SQL + ' AS match_score ';
        keyword_SQL = keyword_SQL.substring(0, keyword_SQL.length - 3);
        keyword_SQL = keyword_SQL + ') ORDER BY match_score DESC';
        ORDER_SQL = ", apply_end is null ASC, apply_end ASC";
    }

    var SQL = "SELECT p_code, title, apply_start, apply_end, " +
        "concat_ws('', (CASE Employment_sup WHEN '1' THEN '취업지원' END), " +
        "(CASE Startup_sup WHEN '1' THEN '창업지원' END), " +
        "(CASE Life_welfare WHEN 1 THEN '생활복지' END), " +
        "(CASE Residential_finance WHEN 1 THEN '주거금융' END)) AS category, " +
        "concat_ws(' ', dor, (CASE dor WHEN '전국' THEN '' ELSE si END)) AS region" +
        match_score_SQL +
        'FROM policy NATURAL JOIN interest WHERE ' +
        "(apply_start > NOW()) AND " +
        category_SQL +
        age_SQL +
        location_SQL +
        keyword_SQL +
        ORDER_SQL;

    //var SQL = 'SELECT * FROM policy';

    console.log("API 'search/test' called");
    console.log(SQL);

    connection.query(SQL, function (err, data) {
        if (!err) {
            //console.log(data);
            res.send(data);
        }
        else {
            console.log(err);
            res.send('error');
        }
    });
});


// 공고 후
router.post("/after_apply_search", function (req, res, next) {

    //3. 지역
    // 3.0. 상관없음 ("location = 0"으로 보내주면 ㄳㄳ) 

    // -------------------- 3. 지역 -----------------------

    var arr_location = req.body.location;
    var location_SQL;

    if (arr_location[0] == "전국") {
        location_SQL = '';
    }
    else if (arr_location[1] == "전국") {
        location_SQL = "AND (dor LIKE '" + arr_location[0] + "%')";
    }
    else {
        location_SQL = "AND (dor LIKE '" + arr_location[0] + "%') AND (si LIKE '" + arr_location[1] + "%')";
    }

    if (location_SQL.length == 0)
        location_SQL = ' ';

    //4. 분야 (4개도 세분화해서 ㄱㄱ)
    //4.0. 상관 없음.
    //4.1. Employment_sup(취업지원) - 취업지원금, 서류/면접 지원, 취업지원 프로그램
    //4.2. Startup_sup(창업지원) - 시설/공간 제공, 정책 자금, 멘토링/컨설팅, 사업화
    //4.3. Life_welfare(생활, 복지) - 학자금, 대출/이자, 생활보조(금), 결혼/육아, 교통지원
    //4.4. Residential_financial(주거, 금융) - 기숙사/생활관, 주택지원, 주거환경지원, 고용장려금, 기업지원금

    // 예를 들어서 4.1 이랑 4.4에 관련된 거 찾고 싶으면 "01001"
    // 4.2 이랑 4.4에 관련된 거 찾고 싶으면 "00101"
    // "4.0. 상관없음"이면 "1xxxx" > x는 0이든 1이든 상관없다는 의미

    // -------------------- 4. 분야 -----------------------
    var categoryList = ["Employment_sup", "Startup_sup", "Life_welfare", "Residential_finance"];
    var category_SQL_temp = "(";

    // req.body.category : "01010" (string)
    var recv_category = req.body.category;


    if (recv_category[0] == 1) {
        recv_category = "11111";
    }

    for (var i = 1; i < 5; i++) {
        if (recv_category[i] == 1) {
            category_SQL_temp += categoryList[i - 1] + " = 1 OR ";
        }
    }
    category_SQL_temp = category_SQL_temp.substr(0, category_SQL_temp.length - 3) + ") ";
    category_SQL = category_SQL_temp;

    if (recv_category.length == 0)
        category_SQL = ' ';



    //5. 연령 - 
    //5.0 연령 제한 없음( "age = 0"으로 보내주면 ㄳㄳ)
    //5.1 integer (샘플 데이터로는 몇 개 못 뽑을 듯)
    var recv_age = req.body.age;
    var age_SQL = '';

    if (recv_age != 0 && recv_age != null)   // "연령 제한 없음"이 아니면
    {
        age_SQL = 'AND ' + 'end_age >= ' + recv_age + ' AND ' + 'start_age <= ' + recv_age + ' ';
    }

    //6. 키워드 기반 검색 - title, contents내에 해당 키워드가 있으면 ㅇㅋ
    var match_score_SQL = req.body.keyword;

    var ORDER_SQL;
    //var keyword_length = match_score_SQL.length;

    //keword input이 없을 때
    if (match_score_SQL == null || match_score_SQL.length == 0) {
        match_score_SQL = ' ';
        keyword_SQL = '';
        ORDER_SQL = "ORDER BY apply_end is null ASC, apply_end ASC";
    }
    else {
        //키워드 필터링
        var regex = /[가-힣A-Za-z0-9]+/g;

        var match = match_score_SQL.match(regex);

        var match_score_SQL = ', ';
        var keyword_SQL = 'AND (';

        if (match.length == 0)   //필터링된 키워드가 없을 때 
        {
            match_score_SQL = ' ';
            keyword_SQL = '';
            ORDER_SQL = "ORDER BY apply_end is null ASC, apply_end ASC";
        }

        for (var i = 0; i < match.length; i++) {
            //console.log(match[i]);
            //title, contents 
            match_score_SQL = match_score_SQL + '(title LIKE \"%' + match[i] + '%\")' + '+' + '(contents LIKE \"%' + match[i] + '%\") ' + '+ ';
            keyword_SQL = keyword_SQL + 'title LIKE \"%' + match[i] + '%\" OR contents LIKE \"%' + match[i] + '%\" OR ';
            //console.log(match_score_SQL);
        }
        match_score_SQL = match_score_SQL.substring(0, match_score_SQL.length - 2);
        match_score_SQL = match_score_SQL + ' AS match_score ';
        keyword_SQL = keyword_SQL.substring(0, keyword_SQL.length - 3);
        keyword_SQL = keyword_SQL + ') ORDER BY match_score DESC';
        ORDER_SQL = ", apply_end is null ASC, apply_end ASC";
    }

    var SQL = "SELECT p_code, title, apply_start, apply_end, " +
        "concat_ws('', (CASE Employment_sup WHEN '1' THEN '취업지원' END), " +
        "(CASE Startup_sup WHEN '1' THEN '창업지원' END), " +
        "(CASE Life_welfare WHEN 1 THEN '생활복지' END), " +
        "(CASE Residential_finance WHEN 1 THEN '주거금융' END)) AS category, " +
        "concat_ws(' ', dor, (CASE dor WHEN '전국' THEN '' ELSE si END)) AS region" +
        match_score_SQL +
        'FROM policy NATURAL JOIN interest WHERE ' +
        "(apply_end < NOW()) AND " +
        category_SQL +
        age_SQL +
        location_SQL +
        keyword_SQL +
        ORDER_SQL;

    //var SQL = 'SELECT * FROM policy';

    console.log("API 'search/test' called");
    console.log(SQL);

    connection.query(SQL, function (err, data) {
        if (!err) {
            //console.log(data);
            res.send(data);
        }
        else {
            console.log(err);
            res.send('error');
        }
    });
});


// 공고 후
router.post("/apply_search", function (req, res, next) {

    //3. 지역
    // 3.0. 상관없음 ("location = 0"으로 보내주면 ㄳㄳ) 

    // -------------------- 3. 지역 -----------------------

    var arr_location = req.body.location;
    var location_SQL;

    if (arr_location[0] == "전국") {
        location_SQL = '';
    }
    else if (arr_location[1] == "전국") {
        location_SQL = "AND (dor LIKE '" + arr_location[0] + "%')";
    }
    else {
        location_SQL = "AND (dor LIKE '" + arr_location[0] + "%') AND (si LIKE '" + arr_location[1] + "%')";
    }

    if (location_SQL.length == 0)
        location_SQL = ' ';

    //4. 분야 (4개도 세분화해서 ㄱㄱ)
    //4.0. 상관 없음.
    //4.1. Employment_sup(취업지원) - 취업지원금, 서류/면접 지원, 취업지원 프로그램
    //4.2. Startup_sup(창업지원) - 시설/공간 제공, 정책 자금, 멘토링/컨설팅, 사업화
    //4.3. Life_welfare(생활, 복지) - 학자금, 대출/이자, 생활보조(금), 결혼/육아, 교통지원
    //4.4. Residential_financial(주거, 금융) - 기숙사/생활관, 주택지원, 주거환경지원, 고용장려금, 기업지원금

    // 예를 들어서 4.1 이랑 4.4에 관련된 거 찾고 싶으면 "01001"
    // 4.2 이랑 4.4에 관련된 거 찾고 싶으면 "00101"
    // "4.0. 상관없음"이면 "1xxxx" > x는 0이든 1이든 상관없다는 의미

    // -------------------- 4. 분야 -----------------------
    var categoryList = ["Employment_sup", "Startup_sup", "Life_welfare", "Residential_finance"];
    var category_SQL_temp = "(";

    // req.body.category : "01010" (string)
    var recv_category = req.body.category;


    if (recv_category[0] == 1) {
        recv_category = "11111";
    }

    for (var i = 1; i < 5; i++) {
        if (recv_category[i] == 1) {
            category_SQL_temp += categoryList[i - 1] + " = 1 OR ";
        }
    }
    category_SQL_temp = category_SQL_temp.substr(0, category_SQL_temp.length - 3) + ") ";
    category_SQL = category_SQL_temp;

    if (recv_category.length == 0)
        category_SQL = ' ';



    //5. 연령 - 
    //5.0 연령 제한 없음( "age = 0"으로 보내주면 ㄳㄳ)
    //5.1 integer (샘플 데이터로는 몇 개 못 뽑을 듯)
    var recv_age = req.body.age;
    var age_SQL = '';

    if (recv_age != 0 && recv_age != null)   // "연령 제한 없음"이 아니면
    {
        age_SQL = 'AND ' + 'end_age >= ' + recv_age + ' AND ' + 'start_age <= ' + recv_age + ' ';
    }

    //6. 키워드 기반 검색 - title, contents내에 해당 키워드가 있으면 ㅇㅋ
    var match_score_SQL = req.body.keyword;

    var ORDER_SQL;
    //var keyword_length = match_score_SQL.length;

    //keword input이 없을 때
    if (match_score_SQL == null || match_score_SQL.length == 0) {
        match_score_SQL = ' ';
        keyword_SQL = '';
        ORDER_SQL = "ORDER BY apply_end is null ASC, apply_end ASC";
    }
    else {
        //키워드 필터링
        var regex = /[가-힣A-Za-z0-9]+/g;

        var match = match_score_SQL.match(regex);

        var match_score_SQL = ', ';
        var keyword_SQL = 'AND (';

        if (match.length == 0)   //필터링된 키워드가 없을 때 
        {
            match_score_SQL = ' ';
            keyword_SQL = '';
            ORDER_SQL = "ORDER BY apply_end is null ASC, apply_end ASC";
        }

        for (var i = 0; i < match.length; i++) {
            //console.log(match[i]);
            //title, contents 
            match_score_SQL = match_score_SQL + '(title LIKE \"%' + match[i] + '%\")' + '+' + '(contents LIKE \"%' + match[i] + '%\") ' + '+ ';
            keyword_SQL = keyword_SQL + 'title LIKE \"%' + match[i] + '%\" OR contents LIKE \"%' + match[i] + '%\" OR ';
            //console.log(match_score_SQL);
        }
        match_score_SQL = match_score_SQL.substring(0, match_score_SQL.length - 2);
        match_score_SQL = match_score_SQL + ' AS match_score ';
        keyword_SQL = keyword_SQL.substring(0, keyword_SQL.length - 3);
        keyword_SQL = keyword_SQL + ') ORDER BY match_score DESC';
        ORDER_SQL = ", apply_end is null ASC, apply_end ASC";
    }

    var SQL = "SELECT p_code, title, apply_start, apply_end, " +
        "concat_ws('', (CASE Employment_sup WHEN '1' THEN '취업지원' END), " +
        "(CASE Startup_sup WHEN '1' THEN '창업지원' END), " +
        "(CASE Life_welfare WHEN 1 THEN '생활복지' END), " +
        "(CASE Residential_finance WHEN 1 THEN '주거금융' END)) AS category, " +
        "concat_ws(' ', dor, (CASE dor WHEN '전국' THEN '' ELSE si END)) AS region" +
        match_score_SQL +
        'FROM policy NATURAL JOIN interest WHERE ' +
        "((apply_start <= NOW() AND apply_end >= NOW()) OR expiration_flag = 2) AND " +
        category_SQL +
        age_SQL +
        location_SQL +
        keyword_SQL +
        ORDER_SQL;

    //var SQL = 'SELECT * FROM policy';

    console.log("API 'search/test' called");
    console.log(SQL);

    connection.query(SQL, function (err, data) {
        if (!err) {
            //console.log(data);
            res.send(data);
        }
        else {
            console.log(err);
            res.send('error');
        }
    });
});


// 상시
router.post("/always_search", function (req, res, next) {

    //3. 지역
    // 3.0. 상관없음 ("location = 0"으로 보내주면 ㄳㄳ) 

    // -------------------- 3. 지역 -----------------------

    var arr_location = req.body.location;
    var location_SQL;

    if (arr_location[0] == "전국") {
        location_SQL = '';
    }
    else if (arr_location[1] == "전국") {
        location_SQL = "AND (dor LIKE '" + arr_location[0] + "%')";
    }
    else {
        location_SQL = "AND (dor LIKE '" + arr_location[0] + "%') AND (si LIKE '" + arr_location[1] + "%')";
    }

    if (location_SQL.length == 0)
        location_SQL = ' ';

    //4. 분야 (4개도 세분화해서 ㄱㄱ)
    //4.0. 상관 없음.
    //4.1. Employment_sup(취업지원) - 취업지원금, 서류/면접 지원, 취업지원 프로그램
    //4.2. Startup_sup(창업지원) - 시설/공간 제공, 정책 자금, 멘토링/컨설팅, 사업화
    //4.3. Life_welfare(생활, 복지) - 학자금, 대출/이자, 생활보조(금), 결혼/육아, 교통지원
    //4.4. Residential_financial(주거, 금융) - 기숙사/생활관, 주택지원, 주거환경지원, 고용장려금, 기업지원금

    // 예를 들어서 4.1 이랑 4.4에 관련된 거 찾고 싶으면 "01001"
    // 4.2 이랑 4.4에 관련된 거 찾고 싶으면 "00101"
    // "4.0. 상관없음"이면 "1xxxx" > x는 0이든 1이든 상관없다는 의미

    // -------------------- 4. 분야 -----------------------
    var categoryList = ["Employment_sup", "Startup_sup", "Life_welfare", "Residential_finance"];
    var category_SQL_temp = "(";

    // req.body.category : "01010" (string)
    var recv_category = req.body.category;


    if (recv_category[0] == 1) {
        recv_category = "11111";
    }

    for (var i = 1; i < 5; i++) {
        if (recv_category[i] == 1) {
            category_SQL_temp += categoryList[i - 1] + " = 1 OR ";
        }
    }
    category_SQL_temp = category_SQL_temp.substr(0, category_SQL_temp.length - 3) + ") ";
    category_SQL = category_SQL_temp;

    if (recv_category.length == 0)
        category_SQL = ' ';



    //5. 연령 - 
    //5.0 연령 제한 없음( "age = 0"으로 보내주면 ㄳㄳ)
    //5.1 integer (샘플 데이터로는 몇 개 못 뽑을 듯)
    var recv_age = req.body.age;
    var age_SQL = '';

    if (recv_age != 0 && recv_age != null)   // "연령 제한 없음"이 아니면
    {
        age_SQL = 'AND ' + 'end_age >= ' + recv_age + ' AND ' + 'start_age <= ' + recv_age + ' ';
    }

    //6. 키워드 기반 검색 - title, contents내에 해당 키워드가 있으면 ㅇㅋ
    var match_score_SQL = req.body.keyword;

    var ORDER_SQL;
    //var keyword_length = match_score_SQL.length;

    //keword input이 없을 때
    if (match_score_SQL == null || match_score_SQL.length == 0) {
        match_score_SQL = ' ';
        keyword_SQL = '';
        ORDER_SQL = "ORDER BY apply_end is null ASC, apply_end ASC";
    }
    else {
        //키워드 필터링
        var regex = /[가-힣A-Za-z0-9]+/g;

        var match = match_score_SQL.match(regex);

        var match_score_SQL = ', ';
        var keyword_SQL = 'AND (';

        if (match.length == 0)   //필터링된 키워드가 없을 때 
        {
            match_score_SQL = ' ';
            keyword_SQL = '';
            ORDER_SQL = "ORDER BY apply_end is null ASC, apply_end ASC";
        }

        for (var i = 0; i < match.length; i++) {
            //console.log(match[i]);
            //title, contents 
            match_score_SQL = match_score_SQL + '(title LIKE \"%' + match[i] + '%\")' + '+' + '(contents LIKE \"%' + match[i] + '%\") ' + '+ ';
            keyword_SQL = keyword_SQL + 'title LIKE \"%' + match[i] + '%\" OR contents LIKE \"%' + match[i] + '%\" OR ';
            //console.log(match_score_SQL);
        }
        match_score_SQL = match_score_SQL.substring(0, match_score_SQL.length - 2);
        match_score_SQL = match_score_SQL + ' AS match_score ';
        keyword_SQL = keyword_SQL.substring(0, keyword_SQL.length - 3);
        keyword_SQL = keyword_SQL + ') ORDER BY match_score DESC';
        ORDER_SQL = ", apply_end is null ASC, apply_end ASC";
    }

    var SQL = "SELECT p_code, title, apply_start, apply_end, " +
        "concat_ws('', (CASE Employment_sup WHEN '1' THEN '취업지원' END), " +
        "(CASE Startup_sup WHEN '1' THEN '창업지원' END), " +
        "(CASE Life_welfare WHEN 1 THEN '생활복지' END), " +
        "(CASE Residential_finance WHEN 1 THEN '주거금융' END)) AS category, " +
        "concat_ws(' ', dor, (CASE dor WHEN '전국' THEN '' ELSE si END)) AS region" +
        match_score_SQL +
        "FROM policy NATURAL JOIN interest WHERE " +
        "expiration_flag = 2 AND " +
        category_SQL +
        age_SQL +
        location_SQL +
        keyword_SQL +
        ORDER_SQL;

    //var SQL = 'SELECT * FROM policy';

    console.log("API 'search/test' called");
    console.log(SQL);

    connection.query(SQL, function (err, data) {
        if (!err) {
            //console.log(data);
            res.send(data);
        }
        else {
            console.log(err);
            res.send('error');
        }
    });
});



module.exports = router;
