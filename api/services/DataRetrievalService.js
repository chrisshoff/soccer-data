var jsdom = require("jsdom"),
    moment = require("moment");

var epl_table_url = "http://www.bbc.com/sport/football/premier-league/table";
var jquery_url = "//ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js";

exports.init_table_data_update = function(interval) {
    update_table_data(function() {});
    setInterval(function() {
        update_table_data(function() {});
    }, interval);
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
                var slug = name.toLowerCase().replace(/ /g, "_");
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
