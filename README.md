# ApiWrapper

A lightweight wrapper for any api.


#Usage

Create a JSON object to describe your api.

    var BlogAPI = new ApiWrapper({
  
      apiPath: "http://api.blogapp.com",
  
      ajaxOptions: {
        headers: {
          access_token: "123456789"
        },
      },
  
      resources: {
  
        User:{
          require  : ["id"],
          defaults : {id: "me"},
          basePath : "users/{:id}",
          methods  : {
            fetch         : {},
            update        : {type: "put"},
            destroy       : {type: "delete"},
            posts         : {type: "get"  , url: "posts/"},
            createPost    : {type: "post" , url: "posts/", require:['title', 'body']}
          },
          static: {
            new: {type: "post"  , url: "users/", require: ['name', 'email']}
          }
          
        },
  
        Post: {
          require: ["id"],
          basePath : "posts/{:id}",
          methods: {
            fetch         : {},
            update        : {type: "put"},
            destroy       : {type: "delete"},
            comments      : {type: "get"  , url: "comments/"},
            
            commentsByAuthor : {type: "get"  , url: "comments/{:author_name}"  , require: ['author_name']},
            createComment    : {type: "get"  , url: "comments/"                , require: ['body']},
            tagPost          : {type: "post" , url: "tags/{:name}"             , require:['name']}
          }        
        },
  
        Comment: {
          require: ["id"],
          basePath: "comments/{:id}",
          methods: {
            fetch         : {},
            update        : {type: "put"},
            destroy       : {type: "delete"}
          }
        }
  
      }
    });


Then you can access it like this:
  
  
    var myUser = BlogAPI.User();
    
    // makes an ajax call to http://api.blogapp.com/users/me
    myUser.fetch()
  
    var anotherUser = BlogAPI.getUser(123);
    
    // http://api.blogapp.com/users/123
    anotherUser.fetch()
  
    // http://api.blogapp.com/users/123/posts?sort_by=date
    anotherUser.posts({sort_by:"date"})
    
    // Sends a post request to http://api.blogapp.com/users/
    // with name and email parameters
    BlogAPI.User.new("jane", "jane@example.com");
  
  
    var myPost = BlogAPI.Post(123);
  
    // http://api.blogapp.com/posts/123
    mypost.fetch()
  
    // http://api.blogapp.com/posts/123/comments
    mypost.comments()
  
    // http://api.blogapp.com/posts/123/comments?page=2
    mypost.comments({page:2})
    
    // http://api.blogapp.com/posts/123/tag/favorite
    mypost.tagPost("favorite")

  
All calls return a promise

    BlogAPI.createComment(123, "This is a new Comment on post 123").then(function(response){
        console.log(response)
    }, function(err){
        console.log(err)
    })




