---
layout: collection
title: "Blog Posts"
collection: posts
permalink: /blog/
author_profile: true
entries_layout: grid
classes: wide
mathjax: true
header:
  overlay_color: "#005"
  overlay_filter: "0.5"
  overlay_image: /assets/images/blog-header.jpg
  
excerpt: "Explore my thoughts, research findings, and insights on various topics."
---

<div class="grid__wrapper">
  {% for post in site.posts %}
    {% include archive-single.html type="grid" %}
  {% endfor %}
</div>
