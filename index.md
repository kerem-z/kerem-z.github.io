---
layout: home
author_profile: true
---

Hey there! Welcome to my digital hangout. I'm Kerem, a [your position] at Middle East Technical University, and I'm all about [your field, described casually].

## Latest Blog Posts

{% for post in site.posts limit:3 %}
  {% include archive-single.html %}
{% endfor %}

## Cool Stuff I'm Working On

{% for project in site.projects limit:2 %}
  {% include archive-single.html %}
{% endfor %}

## My Latest Brain Dumps (aka Publications)

{% for publication in site.publications limit:2 %}
  {% include archive-single.html %}
{% endfor %}

[Check out all my publications](/publications/) (if you're into that sort of thing)

## What's New?

- [Brief, casual update about your recent work or life]
- [Another interesting tidbit, maybe something fun or unexpected]

Feel free to explore, and don't hesitate to reach out if you want to chat about tech, research, or the best coffee spots in town!