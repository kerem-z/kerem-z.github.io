---
layout: collection
title: "Blog Posts"
collection: posts
permalink: /blog/
author_profile: true
entries_layout: grid
classes: wide
mathjax: true
use_math: true
excerpt: "Some Thoughts on some topics."
---

<div class="grid__wrapper">
  {% assign unique_posts = site.posts | uniq %}
  {% for post in unique_posts %}
    {% include archive-single.html type="grid" %}
  {% endfor %}
</div>


