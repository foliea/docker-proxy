require 'socket'
require 'curb'

Docker::Response = Struct.new(:status, :body, :headers)

module Docker
  class Request < Struct.new(:client, :request, :params)
    # headers must add ssl certficates if client.tls_verify?
    # send block as method (something like .get(url, &avoid_exceptions)

    def send
      return hijack if hijack?

      __send__(method)
    end

    private

    def stream(socket)
      curl = Curl::Easy.new(url)

      curl.on_body   { |data| socket.write(data) }
      curl.on_header { |data| socket.write(data) }

      curl.multipart_form_post = true
      curl.http_post
    end

    def hijack
      request.env['rack.hijack'].call
      socket = request.env['rack.hijack_io']
      Thread.new do
        begin
          stream(socket)
        ensure
          socket.close
        end
      end
      # use grape/sinatra response instead?
      Docker::Response.new(200, '', '')
    end

    def hijack?
      request.env['HTTP_UPGRADE']    == 'tcp' &&
      request.env['HTTP_CONNECTION'] == 'Upgrade' &&
      request.env['rack.hijack?']
    end

    def headers
      {
        'Content-Type' => 'application/json',
        'Accept'       => 'application/json',
      }
    end

    def method
      request.request_method.downcase
    end

    def content
      @content ||= request.body.read
    end

    def url
      @url ||= "#{client.host}#{request.script_name}#{request.path_info}?#{request.query_string}"
    end

    # TODO: Share Curl::Easy.new across request
    def get
      curl.tap(&:http_get)
    end

    def post
      curl.tap { |c| c.http_post(content) }
    end

    def delete
      curl.tap(&:http_delete)
    end

    def curl
      Curl::Easy.new(url) do |curl|
        curl.headers['Content-Type'] = 'application/json'
      end
    end
  end
end