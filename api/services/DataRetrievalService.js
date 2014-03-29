var jsdom = require("jsdom"),
    moment = require("moment");

var epl_table_url = "http://www.bbc.com/sport/football/premier-league/table";
var team_results_url = "http://www.bbc.com/sport/football/teams/{team}/results";
var jquery_url = "//ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js";

var adjusted_slugs = {
    "man-city" : "manchester-city",
    "tottenham" : "tottenham-hotspur",
    "man-utd" : "manchester-united",
    "stoke" : "stoke-city",
    "newcastle" : "newcastle-united",
    "west-ham" : "west-ham-united",
    "hull" : "hull-city",
    "norwich" : "norwich-city",
    "west-brom" : "west-bromwich-albion",
    "swansea" : "swansea-city",
    "cardiff" : "cardiff-city"
}

exports.init_table_data_update = function(table_interval, team_results_interval) {
    update_table_data(function() {
        DataRetrievalService.scrape_team_results_data(function() {});
    });
    setInterval(function() {
        update_table_data(function() {});
    }, table_interval);
    setInterval(function() {
        DataRetrievalService.scrape_team_results_data(function() {});
    }, team_results_interval);
}

function update_table_data(callback) {
    DataRetrievalService.scrape_table_data(function(rows) {
        for (var i in rows) {
            var thisPosition = Teams.findOne({ position : rows[i].position }, function(err, existing_row) {
                if (existing_row) {
                    // Update team at position
                    existing_row.name = rows[i].name;
                    existing_row.slug = rows[i].slug;
                    existing_row.gd = rows[i].gd;
                    existing_row.played = rows[i].played;
                    existing_row.points = rows[i].points;
                    existing_row.save(function(err) {});
                } else {
                    // Create new team at position
                    Teams.create(rows[i]).done(function(err, created_row) {});
                }
            });
        }

        callback();
    });
}

exports.scrape_table_data = function(callback) {
    var rows = [];

    jsdom.env(
        epl_table_url,
        [jquery_url],
        function(err, window) {
            var $ = window.jQuery;
            $(".table-stats:first .team").each(function() {
                var name = $(this).find(".team-name").text();
                var slug = name.toLowerCase().replace(/ /g, "-");
                var row = {
                    position: $(this).find(".position .position-number").text(),
                    name: name,
                    slug: slug,
                    points: $(this).find(".points").text(),
                    gd: $(this).find(".goal-difference").text(),
                    played: $(this).find(".played").text()
                };

                rows.push(row);
            });

            callback(rows);
        }
    );
}

exports.scrape_team_results_data = function(callback) {
    var results_returned = 0;
    console.log("here");
    Teams.find().done(function(err, teams) {
        for (var i in teams) {
                jsdom.env(
                    team_results_url.replace(
                        new RegExp("{team}","g"), 
                            adjusted_slugs[teams[i].slug] ? adjusted_slugs[teams[i].slug] : teams[i].slug), 
                    [jquery_url],
                (function(team_idx) {
                    return function(err, window) {
                        results_returned++;
                        var $ = window.jQuery;
                        var matches_json = [];
                        teams[team_idx].slug + " : " + $("tr.report").each(function() {
                            if ($.trim($(this).find(".match-competition").text()) == "Premier League") {
                                var date = $.trim($(this).find(".match-date").text());
                                var home = $.trim($(this).find(".team-home").text());
                                var away = $.trim($(this).find(".team-away").text());
                                var score = $.trim($(this).find(".score").text());
                                var score_array = score.split("-");
                                var home_score = parseInt(score_array[0]);
                                var away_score = parseInt(score_array[1]);
                                var points = 0;
                                if (home_score == away_score) {
                                    points = 1;
                                } else if (home_score > away_score && home.toLowerCase() == teams[team_idx].name.toLowerCase()) {
                                    points = 3;
                                } else if (away_score > home_score && away.toLowerCase() == teams[team_idx].name.toLowerCase()) {
                                    points = 3;
                                }

                                matches_json.push({ date: date, home: home, away: away, home_score: home_score, away_score: away_score, points: points });
                            }
                        });

                        teams[team_idx].matches = matches_json;
                        teams[team_idx].save(function(err){});

                        if (results_returned == 20) {
                            callback();
                        }
                    }
                })(i)
            );
        }
    });
    callback();
}
