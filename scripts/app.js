/**
 *
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
APP.Main = (function() {

  var LAZY_LOAD_THRESHOLD = 300;
  var $ = document.querySelector.bind(document);
  var $a = document.querySelectorAll.bind(document);

  var stories = null;
  var storyStart = 0;
  var count = 100;
  var main = $('main');
  var inDetails = false;
  var storyLoadCount = 0;
  var localeData = {
    data: {
      intl: {
        locales: 'en-US'
      }
    }
  };

  var offsetHeight = main.offsetHeight;
  var scrollHeight = main.scrollHeight;
  var topPadding = 66;
  var storyHeight = 90;

  var tmplStory = $('#tmpl-story').textContent;
  var tmplStoryDetails = $('#tmpl-story-details').textContent;
  var tmplStoryDetailsComment = $('#tmpl-story-details-comment').textContent;

  if (typeof HandlebarsIntl !== 'undefined') {
    HandlebarsIntl.registerWith(Handlebars);
  } else {

    // Remove references to formatRelative, because Intl isn't supported.
    var intlRelative = /, {{ formatRelative time }}/;
    tmplStory = tmplStory.replace(intlRelative, '');
    tmplStoryDetails = tmplStoryDetails.replace(intlRelative, '');
    tmplStoryDetailsComment = tmplStoryDetailsComment.replace(intlRelative, '');
  }

  var storyTemplate =
      Handlebars.compile(tmplStory);
  var storyDetailsTemplate =
      Handlebars.compile(tmplStoryDetails);
  var storyDetailsCommentTemplate =
      Handlebars.compile(tmplStoryDetailsComment);

  /**
   * As every single story arrives in shove its
   * content in at that exact moment. Feels like something
   * that should really be handled more delicately, and
   * probably in a requestAnimationFrame callback.
   */
  function onStoryData (key, details) {

    // This seems odd. Surely we could just select the story
    // directly rather than looping through all of them.
    var story = $('#s-' + key);

    details.time *= 1000;
    var html = storyTemplate(details);
    story.innerHTML = html;
    story.addEventListener('click', onStoryClick.bind(this, details));
    story.classList.add('clickable');

    // Tick down. When zero we can batch in the next load.
    storyLoadCount--;

    // Colorize on complete.
    if (storyLoadCount === 0)
      colorizeAndScaleStories();
  }

  function onStoryClick(details) {

    var storyDetails = $('sd-' + details.id);

    // Wait a little time then show the story details.
    setTimeout(showStory.bind(this, details.id), 60);

    // Create and append the story. A visual change...
    // perhaps that should be in a requestAnimationFrame?
    // And maybe, since they're all the same, I don't
    // need to make a new element every single time? I mean,
    // it inflates the DOM and I can only see one at once.
    if (!storyDetails) {

      if (details.url)
        details.urlobj = new URL(details.url);

      var comment;
      var commentsElement;
      var storyHeader;
      var storyContent;

      var storyDetailsHtml = storyDetailsTemplate(details);
      var kids = details.kids;
      var commentHtml = storyDetailsCommentTemplate({
        by: '', text: 'Loading comment...'
      });

      storyDetails = document.createElement('section');
      storyDetails.setAttribute('id', 'sd-' + details.id);
      storyDetails.classList.add('story-details');
      storyDetails.innerHTML = storyDetailsHtml;

      document.body.appendChild(storyDetails);

      commentsElement = storyDetails.querySelector('.js-comments');
      storyHeader = storyDetails.querySelector('.js-header');
      storyContent = storyDetails.querySelector('.js-content');

      var closeButton = storyDetails.querySelector('.js-close');
      closeButton.addEventListener('click', hideStory.bind(this, details.id));

      // var headerHeight = storyHeader.offsetHeight;
      storyContent.style.paddingTop = 140 + 'px';

      if (typeof kids === 'undefined')
        return;

      for (var k = 0; k < kids.length; k++) {

        comment = document.createElement('aside');
        comment.setAttribute('id', 'sdc-' + kids[k]);
        comment.classList.add('story-details__comment');
        comment.innerHTML = commentHtml;
        commentsElement.appendChild(comment);

        // Update the comment with the live data.
        APP.Data.getStoryComment(kids[k], function(commentDetails) {

          commentDetails.time *= 1000;

          var comment = commentsElement.querySelector(
              '#sdc-' + commentDetails.id);
          comment.innerHTML = storyDetailsCommentTemplate(
              commentDetails,
              localeData);
        });
      }
    }

  }

  function showStory(id) {

    if (inDetails)
      return;

    inDetails = true;

    var storyDetails = $('#sd-' + id);
    if (!storyDetails) return;
    
    var left = storyDetails.getBoundingClientRect().left;
    var step = -0.1 * left;

    document.body.classList.add('details-active');
    storyDetails.style.opacity = 1;

    requestAnimationFrame(animate);

    function animate () {

      // Now figure out where it needs to go.
      left += step;
      storyDetails.style.left = left + 'px';

      // Set up the next bit of the animation if there is more to do.
      if (Math.abs(left) > 0.5)
        requestAnimationFrame(animate);
      else {
        left = 0;
        storyDetails.style.left = '0px';
      }
      // And update the styles. Wait, is this a read-write cycle?
      // I hope I don't trigger a forced synchronous layout!
    }

    // We want slick, right, so let's do a setTimeout
    // every few milliseconds. That's going to keep
    // it all tight. Or maybe we're doing visual changes
    // and they should be in a requestAnimationFrame
    
  }

  function hideStory(id) {

    if (!inDetails)
      return;

    var storyDetails = $('#sd-' + id);
    var left = 0;

    var mainPosWidth = main.getBoundingClientRect().width;
    var storyDetailsPosLeft = storyDetails.getBoundingClientRect().left;
    var target = mainPosWidth + 100;
    var step = (target - storyDetailsPosLeft) * 0.1;

    document.body.classList.remove('details-active');
    storyDetails.style.opacity = 0;

    requestAnimationFrame(animate);
    
    function animate () {
      // Now figure out where it needs to go.
      left += step;
      storyDetails.style.left = left + 'px';
      
      // Set up the next bit of the animation if there is more to do.
      if (Math.abs(left - target) > 0.5) {
        requestAnimationFrame(animate);
      } else {
        left = target;
        inDetails = false;
      }
    }
    // We want slick, right, so let's do a setTimeout
    // every few milliseconds. That's going to keep
    // it all tight. Or maybe we're doing visual changes
    // and they should be in a requestAnimationFrame
  }

  /**
   * Does this really add anything? Can we do this kind
   * of work in a cheaper way?
   */
  function colorizeAndScaleStories(scrollTop) {
    if (scrollTop === undefined) scrollTop = main.scrollTop;
    var storyElements = $a('.story');

    var maxCount = Math.ceil((offsetHeight - 86) / 90) + 1;
    var startPos = ~~((scrollTop - topPadding) / storyHeight);
    var endPos   = startPos + maxCount;
    var scoreLocation;

    var scoreRects = storyElements[startPos].querySelector('.story__score');
    var scoreRectsTopBase = scoreRects.getBoundingClientRect().top;

    // It does seem awfully broad to change all the
    // colors every time!
    for (var s = startPos; s < endPos; s++) {

      var story = storyElements[s];
      var score = story.querySelector('.story__score');
      var title = story.querySelector('.story__title');
      var saturation = 100 - 100 / maxCount * (s - startPos);

      // Base the scale on the y position of the score.

      var scale = Math.min(1, 1 - (0.05 * ((scoreRectsTopBase - 170) / offsetHeight)));
      var opacity = Math.min(1, 1 - (0.5 * ((scoreRectsTopBase - 170) / offsetHeight)));

      score.style.width = (scale * 40) + 'px';
      score.style.height = (scale * 40) + 'px';
      score.style.lineHeight = (scale * 40) + 'px';
      score.style.backgroundColor = 'hsl(42, ' + saturation + '%, 50%)';
      title.style.opacity = opacity;
    }
  }

  main.addEventListener('touchstart', function(evt) {

    // I just wanted to test what happens if touchstart
    // gets canceled. Hope it doesn't block scrolling on mobiles...
    if (Math.random() > 0.97) {
      evt.preventDefault();
    }

  });

  main.addEventListener('scroll', function() {

    var header = $('header');
    var headerTitles = header.querySelector('.header__title-wrapper');
    var scrollTop    = main.scrollTop;
    var scrollTopCapped = Math.min(70, scrollTop);
    var loadThreshold = (scrollHeight - offsetHeight - LAZY_LOAD_THRESHOLD);
    var scaleString = 'scale(' + (1 - (scrollTopCapped / 300)) + ')';

    colorizeAndScaleStories(scrollTop);

    header.style.height = (156 - scrollTopCapped) + 'px';
    headerTitles.style.webkitTransform = scaleString;
    headerTitles.style.transform = scaleString;

    // Add a shadow to the header.
    if (scrollTop > 70)
      document.body.classList.add('raised');
    else
      document.body.classList.remove('raised');

    // Check if we need to load the next batch of stories.
    
    if (scrollTop > loadThreshold) loadStoryBatch();
  });

  function loadStoryBatch() {

    if (storyLoadCount > 0)
      return;

    // Update scrollHeight only when fetched data
    scrollHeight = main.scrollHeight;

    storyLoadCount = count;
    
    var end = storyStart + count;
    var storyFragment = document.createDocumentFragment();
    for (var i = storyStart; i < end; i++) {

      if (i >= stories.length)
        return;

      var key = String(stories[i]);
      var story = document.createElement('div');
      story.setAttribute('id', 's-' + key);
      story.classList.add('story');
      story.innerHTML = storyTemplate({
        title: '...',
        score: '-',
        by: '...',
        time: 0
      });
      storyFragment.appendChild(story);

      APP.Data.getStoryById(stories[i], onStoryData.bind(this, key));
    }

    main.appendChild(storyFragment);
    

    storyStart += count;

  }

  // Bootstrap in the stories.
  APP.Data.getTopStories(function(data) {
    stories = data;
    loadStoryBatch();
    main.classList.remove('loading');
  });

})();
