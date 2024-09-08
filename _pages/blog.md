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
header:
  overlay_color: "#005"
  overlay_filter: "0.5"
  overlay_image: /assets/images/blog-header.jpg
  
excerpt: "Explore my thoughts, research findings, and insights on various topics."
---

<div class="grid__wrapper">
  {% assign unique_posts = site.posts | uniq %}
  {% for post in unique_posts %}
    {% include archive-single.html type="grid" %}
  {% endfor %}
</div>
