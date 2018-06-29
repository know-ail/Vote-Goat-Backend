app.intent('SIGIR_Movies', (conv, { movieGenre }) => {
  /*
  Displaying the most upvoted movies to the user.
  */
  conv.data.fallbackCount = 0; // Required for tracking fallback attempts! // For fallback handling

  const current_time = Date.now();

  if (current_time < 1531033200) {
    /*
      Before the event - tell them about it, don't attempt to show any stats!
    */
    const fallback_messages = [
      "Sorry, what do you want to do next?",
      "I didn't catch that. Want to rank movies, get movie recommendations, view your stats or need some help?",
    ];
    const suggestions = ['🗳 Rank Movies', '🤔 Movie Recommendation', '🏆 Show Stats', `🐐 GOAT Movies`, '📑 Help', `🚪 Quit`];

    store_fallback_response(conv, fallback_messages, suggestions);

    const textToSpeech = `<speak>` +
      `The SIGIR 2018 'GOAT' movies will be available from July 8th 2018 onwards, until then there are no movies to show, sorry.` +
      `What do you want to do instead?` +
      `</speak>`;

    const textToDisplay = `The SIGIR 2018 'GOAT' movies will be available from July 8th 2018 onwards, until then there are no movies to show, sorry. What do you want to do instead?`;

    store_repeat_response(conv, 'handle_no_contexts', textToSpeech, textToDisplay); // Storing repeat info

    conv.ask(
      new SimpleResponse({
        speech: textToSpeech,
        text: textToDisplay
      })
    );

    if (conv.surface.capabilities.has('actions.capability.SCREEN_OUTPUT')) {
      conv.ask(
        new Suggestions(suggestions)
      );
    }
  } else {
    /*
      During/After the event - show the stats!
    */
    var movie_genres_string; // Declaring before promise
    var movie_genres_comma_separated_string; // Declaring before promise

    return parse_parameter_list(movieGenre, ' ')
    .then(parsed_movieGenre_string => {
      movie_genres_string = parsed_movieGenre_string;
      //console.log(`GOAT 1: "${parsed_movieGenre_string}" & "${movie_genres_string}"`);

      return parse_parameter_list(movieGenre, ', verbose')
      .then(parsed_movieGenre_comma_separated_string => {

        movie_genres_comma_separated_string = parsed_movieGenre_comma_separated_string;
        //console.log(`GOAT 1: "${parsed_movieGenre_comma_separated_string}" & "${movie_genres_string}"`);

        /*
        TODO: Enable the user to change vote_target?
              const allowed_vote_targets = ['goat_upvotes', 'goat_downvotes', 'total_goat_votes', 'sigir_upvotes', 'sigir_downvotes', 'total_sigir_votes', 'imdbVotes']; // Allowed GOAT vote targets
        */

        const qs_input = {
          //  HUG REST GET request parameters
          genres: movie_genres_string,
          vote_target: 'sigir_upvotes',
          api_key: 'HUG_REST_API_KEY'
        };

        return hug_request('HUG', 'get_goat_movies', 'GET', qs_input)
        .then(body => {
          if (body.goat_movies.length > 1) {
            if (body.success === true && body.valid_key === true) {

              // We've got movies to display!
              let movie_title_length_limit;
              //let goat_text = ``;
              let textToSpeech = ``;
              let textToDisplay = ``;
              let goat_voice = ``;

              if (movieGenre.length > 0) {
                /*
                We need to account for the length of the genres in the SSML.
                Otherwise, validation will fail!
                body.length === quantity of movies returned in GOAT list!
                */
                movie_title_length_limit = Math.floor((640 - 72 - movie_genres_comma_separated_string.length)/body.goat_movies.length);
              } else {
                /*
                No genres input, increase the title length limit!
                */
                movie_title_length_limit = Math.floor((640 - 72)/body.goat_movies.length)
              }


              if (conv.surface.capabilities.has('actions.capability.SCREEN_OUTPUT')) {
                // TODO: Make use of table cards to display this information once it's no longer in developer preview
                let sum_movie_title_lengths; // let to hold summed length of movie titles
                let goat_text = ``;

                for (let index = 0; index < body.goat_movies.length; index++) {
                  /*
                    Iterate over movies in GOAT list to check max length of movie titles
                  */
                  sum_movie_title_lengths += body.goat_movies[index].title;
                }

                for (let index = 0; index < body.goat_movies.length; index++) {
                  // Iterate over movies in GOAT list
                  let current_rank = index + 1; // Movie's ranking in GOAT list
                  let movie_title = ``; // Will populate with value in if statement

                  if (sum_movie_title_lengths > movie_title_length_limit) {
                    let temp_title = body.goat_movies[index].title; // Temporary let for holding title text
                    movie_title = temp_title.substring(0, movie_title_length_limit); // Reducing the length of the movie title
                  } else {
                    movie_title = body.goat_movies[index].title; // non-limited movie title
                  }

                  if (index != (body.goat_movies.length - 1)) {
                    goat_text += `${current_rank}: "${movie_title}" (${body.goat_movies[index].year}) \n`;
                  } else {
                    goat_text += `${current_rank}: "${movie_title}" (${body.goat_movies[index].year})`;
                  }
                  if (index === (body.goat_movies.length - 1)){
                    goat_voice += `and ${movie_title}, <break time="0.3s" />`;
                  } else {
                    goat_voice += `${movie_title}, <break time="0.3s" />`;
                  }
                }


                var goat_movies_list; // Temp variable

                return goat_rows(body)
                .then(goat_rows_list => {
                  // Setting the variable above
                  //console.log(`GOAT rows 1: ${goat_rows_list}`);
                  goat_movies_list = goat_rows_list;
                  return goat_rows_list;
                })
                .then(goat_rows_list => {
                  //console.log(`goat rows 2: ${goat_rows_list}`);
                  if (movie_genres_comma_separated_string.length > 2) {
                    // The user provided genre parameters
                    // >2 because no movie genres is ` `
                    textToSpeech = `<speak>` +
                                     `The greatest ${movie_genres_comma_separated_string} movies of all time, as determined by SIGIR 2018 attendees are: <break time="0.35s" /> ` +
                                      goat_voice +
                                   `</speak>`;
                    textToDisplay = `The greatest ${movie_genres_comma_separated_string} movies of all time, as determined SIGIR 2018 attendees are:\n\n${goat_text}`;
                  } else {
                    // The user didn't provide genre parameters
                    textToSpeech = `<speak>` +
                                     `The greatest movies of all time, as determined by SIGIR 2018 attendees are: <break time="0.35s" /> ` +
                                      goat_voice +
                                   `</speak>`;
                    textToDisplay = `The greatest movies of all time, as determined by SIGIR 2018 attendees are:\n\n${goat_text}`;
                  }
                  return goat_rows_list;
                })
                .then(goat_rows_list => {

                  new BasicCard({
                    title: `About`,
                    text: `These movie rankings have been generated by SIGIR 2018 attendees. You can specify multiple genres to view different results! (E.g "SIGIR scary funny movies)."`,
                    display: 'WHITE'
                  }),

                  chatbase_analytics(
                    conv,
                    `SIGIR ${movie_genres_comma_separated_string} movies!`, // input_message
                    'SIGIR_Movies', // input_intent
                    'Win' // win_or_fail
                  );

                  conv.ask(
                    new SimpleResponse({
                      speech: textToSpeech,
                      text: textToDisplay
                    }),
                    new SimpleResponse({
                      speech: '<speak>What do you want to do next?</speak>',
                      text: 'What do you want to do next?'
                    }),
                    new Suggestions('🗳 Rank Movies', '🤔 Movie Recommendation', '🏆 Show Stats', '📑 Help', `🚪 Quit`)
                  );
                  store_repeat_response(conv, 'getGoat', textToSpeech, textToDisplay); // Storing repeat info
                });

              } else {
                /*
                  The user doesn't have a screen!
                  Best practice is to only present 3 list results, not 10.
                  We aught to provide some sort of paging to
                */
                if (movie_genres_comma_separated_string != ``) { // TODO: Check if the function returns '' or ' '!
                  textToSpeech = `<speak>The 3 greatest ${movie_genres_comma_separated_string} movies of all time, as determined by SIGIR 2018 attendees are: <break time="0.35s" />`;
                  textToDisplay = `The 3 greatest ${movie_genres_comma_separated_string} movies of all time, as determined by SIGIR 2018 attendees are:`;
                } else {
                  textToSpeech = `<speak>` +
                    `The 3 greatest movies of all time, as determined by SIGIR 2018 attendees are: <break time="0.35s" />`;
                  textToDisplay = `The 3 greatest movies of all time, as determined by SIGIR 2018 attendees are:`;
                }

                textToSpeech += `<say-as interpret-as="ordinal">1</say-as> place is ${body.goat_movies[0].title},<break time="0.1s" /> released in ${body.goat_movies[0].year}. <break time="0.35s" />` +
                `<say-as interpret-as="ordinal">2</say-as> place is ${body.goat_movies[1].title},<break time="0.1s" /> released in ${body.goat_movies[1].year}. <break time="0.35s" />` +
                `<say-as interpret-as="ordinal">3</say-as> place is ${body.goat_movies[2].title},<break time="0.1s" /> released in ${body.goat_movies[2].year}. <break time="0.35s" />` +
                `</speak>`;

                textToDisplay += `1st place is ${body.goat_movies[0].title}, released in ${body.goat_movies[0].year}.` +
                `2nd place is ${body.goat_movies[1].title}, released in ${body.goat_movies[1].year}.` +
                `3rd place is ${body.goat_movies[2].title}, released in ${body.goat_movies[2].year}.`;

                chatbase_analytics(
                  conv,
                  `SIGIR ${movie_genres_comma_separated_string} movies! No screen!`, // input_message
                  'SIGIR_Movies', // input_intent
                  'Win' // win_or_fail
                );

                conv.ask(
                  new SimpleResponse({
                    speech: textToSpeech,
                    text: textToDisplay
                  }),
                  new SimpleResponse({
                    speech: `<speak>So, what next?</speak> `,
                    text: `So, what next?`
                  })
                );
                store_repeat_response(conv, 'getGoat', textToSpeech, textToDisplay); // Storing repeat info
              }
            } else {
              // This should never trigger, but better safer than sorry!
              return catch_error(conv, 'Unexpected error!', 'GOAT');
            }
          } else if (body.success === false && body.valid_key === true) {
            /*
              We've not got movies to display!
              Perhaps this is because the user has entered too many movie genres?
            */
            let apologySpeech;
            let apologyText;
            if (movie_genres_string.length > 1) {
              apologySpeech = `Sorry, I couldn't find any movies with the genres ${movie_genres_comma_separated_string} for you. <break time="0.35s" />`;
              apologyText = `Sorry, I couldn't find any movies with the genres ${movie_genres_comma_separated_string} for you.`;
            } else {
              apologySpeech = `Sorry, I was unable to find any SIGIR movies for you. Please try again later.<break time="0.35s" /> `;
              apologyText =  `Sorry, I was unable to find any SIGIR movies for you. Please try again later.`;
              // This should never trigger.. there are earlier checks to prevent this...
            }

            const textToSpeech = `<speak>` +
              apologySpeech +
              `What do you want to do next?<break time="0.25s" /> Rank Movies<break time="0.175s" />, get a Movie Recommendation<break time="0.175s" />, view your stats<break time="0.175s" />, get help<break time="0.175s" /> or quit? <break time="0.25s" />` +
              `</speak>`;

            const textToDisplay = apologyText +
              `What do you want to do next? Rank Movies, get a Movie Recommendation, view your stats, get help or quit?`;

            chatbase_analytics(
              conv,
              `Couldn't find any SIGIR movies!`, // input_message
              'SIGIR_Movies', // input_intent
              'Fail' // win_or_fail
            );

            conv.ask(
              new SimpleResponse({
                speech: textToSpeech,
                text: textToDisplay
              })
            );

            if (conv.surface.capabilities.has('actions.capability.SCREEN_OUTPUT')) {
              // The user has a screen, let's show them suggestion buttons.
              conv.ask(
                new Suggestions('🗳 Rank Movies', '🤔 Movie Recommendation', '🏆 Show Stats', '📑 Help', `🚪 Quit`)
              );
            }

          } else {
            // An invalid api_key, shouldn't happen..
            return catch_error(conv, 'ERROR! Invalid HUG REST API key?', 'GOAT');
          }
        })
        .catch(error_message => {
          return catch_error(conv, error_message, 'progress_notification');
        });

      });
    });
  }
});
